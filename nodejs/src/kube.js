/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

"use strict";

import { KubeConfig, KubernetesObjectApi, Watch, CoreV1Api, AppsV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import yaml    from "yaml";
import fs      from "fs";
import { Log } from "./log.js";

const WATCH_ERROR_THRESHOLD      = 10;   // Log if threshold is exceeded in a minute's time.
export const META_ANNOTATION_CONTROLLED = "dmc-controlled";

var kc;
var client;
var v1Api;
var v1AppApi;
var customApi;
var configMapWatch;
var siteWatch;
var serviceWatch;
var watchErrorCount = 0;
var lastWatchError;
var namespace = 'default';

export function Annotation(obj, key) {
    if (obj && obj.metadata && obj.metadata.annotations) {
        return obj.metadata.annotations[key];
    }

    return undefined;
}

export function Controlled(obj) {
    return exports.Annotation(obj, META_ANNOTATION_CONTROLLED) == 'true';
}

export function Namespace() {
    return namespace;
}

//
// Watchers normally fail (are aborted) after a number of minutes, depending on the configuration of the platform.
// We do not wish to pollute the log with benign watch-fail indications.  However, there are failure modes like
// lack of watch permissions that will fail immediately.  We do need to see these in the logs to know that the role
// rights need to be fixed.  This mechanism will provide legit watch errors every minute.
//
const logWatchErrors = function() {
    if (watchErrorCount > WATCH_ERROR_THRESHOLD) {
        Log(`Watch error rate exceeded threshold:  ${watchErrorCount} in the last minute - ${lastWatchError}`);
    }
    watchErrorCount = 0;
    setTimeout(logWatchErrors, 60 * 1000);
}

export async function KubeStart(in_cluster) {
    kc = new KubeConfig();
    if (in_cluster) {
        kc.loadFromCluster();
    } else {
        kc.loadFromDefault();
    }

    client    = KubernetesObjectApi.makeApiClient(kc);
    v1Api     = kc.makeApiClient(CoreV1Api);
    v1AppApi  = kc.makeApiClient(AppsV1Api);
    customApi = kc.makeApiClient(CustomObjectsApi);

    configMapWatch = new Watch(kc);
    siteWatch      = new Watch(kc);

    try {
        if (in_cluster) {
            namespace = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace', 'utf8');
        } else {
            kc.contexts.forEach(context => {
                if (context.name == kc.currentContext) {
                    namespace = context.namespace;
                }
            });
        }
        Log(`Running in namespace: ${namespace}`);
    } catch (err) {
        Log(`Unable to determine namespace, assuming ${namespace}`);
    }

    setTimeout(logWatchErrors, 60 * 1000);
}

export async function GetSites() {
    const list = await customApi.listNamespacedCustomObject({
        group     : 'skupper.io',
        version   : 'v2alpha1',
        namespace : namespace,
        plural    : 'sites',
    });
    return list.items;
}

export async function LoadSite(name) {
    const site = await customApi.getNamespacedCustomObject(
        'skupper.io',
        'v2alpha1',
        namespace,
        'sites',
        name
    );
    return site.body;
}

export async function GetListeners() {
    const list = await customApi.listNamespacedCustomObject(
        'skupper.io',
        'v2alpha1',
        namespace,
        'listeners'
    );
    return list.body.items;
}

export async function LoadListener(name) {
    const listener = await customApi.getNamespacedCustomObject(
        'skupper.io',
        'v2alpha1',
        namespace,
        'listeners',
        name
    );
    return listener.body;
}

export async function DeleteListener(name) {
    await customApi.deleteNamespacedCustomObject(
        'skupper.io',
        'v2alpha1',
        namespace,
        'listeners',
        name
    );
}

export async function GetConfigmaps() {
    let list = await v1Api.listNamespacedConfigMap({namespace: namespace});
    return list.items;
}

export async function LoadConfigmap(name) {
    let cm = await v1Api.readNamespacedConfigMap({name: name, namespace: namespace});
    return cm;
}

export async function GetServices() {
    let list = await v1Api.listNamespacedService(namespace);
    return list.body.items;
}

export async function LoadService(name) {
    let service = await v1Api.readNamespacedService(name, namespace);
    return service.body;
}

export async function ReplaceService(name, obj) {
    await v1Api.replaceNamespacedService(name, namespace, obj);
}

export async function DeleteService(name) {
    await v1Api.deleteNamespacedService(name, namespace);
}

var siteWatches = [];

const startWatchSites = function() {
    siteWatch.watch(
        `/apis/skupper.io/v2alpha1/namespaces/${namespace}/sites`,
        {},
        (type, apiObj, watchObj) => {
            for (const callback of siteWatches) {
                callback(type, apiObj);
            }
        },
        (err) => {
            if (err) {
                watchErrorCount++;
                lastWatchError = `Sites: ${err}`;
            }
            console.log('RESTARTING SITE WATCHES');
            startWatchSites();
        }
    )
}

export function WatchSites(callback) {
    siteWatches.push(callback);
    if (siteWatches.length == 1) {
        startWatchSites();
    }
}


var configMapWatches = [];

const startWatchConfigMaps = function() {
    configMapWatch.watch(
        `/api/v1/namespaces/${namespace}/configmaps`,
        {},
        (type, apiObj, watchObj) => {
            for (const callback of configMapWatches) {
                callback(type, apiObj);
            }
        },
        (err) => {
            if (err) {
                watchErrorCount++;
                lastWatchError = `ConfigMaps: ${err}`;
            }
            startWatchConfigMaps();
        }
    )
}

export function WatchConfigMaps(callback) {
    configMapWatches.push(callback);
    if (configMapWatches.length == 1) {
        startWatchConfigMaps();
    }
}

var serviceWatches = [];

const startWatchServices = function() {
    serviceWatch.watch(
        `/api/v1/namespaces/${namespace}/services`,
        {},
        (type, apiObj, watchObj) => {
            for (const callback of serviceWatches) {
                callback(type, apiObj);
            }
        },
        (err) => {
            if (err) {
                watchErrorCount++;
                lastWatchError = `Services: ${err}`;
            }
            startWatchServices();
        }
    )
}

export function WatchServices(callback) {
    serviceWatches.push(callback);
    if (serviceWatches.length == 1) {
        startWatchServices();
    }
}

export async function ApplyObject(obj) {
    try {
        if (obj.metadata.annotations == undefined) {
            obj.metadata.annotations = {};
        }
        obj.metadata.annotations[META_ANNOTATION_CONTROLLED] = "true";
        obj.metadata.namespace = namespace;
        Log(`Creating resource: ${obj.kind} ${obj.metadata.name}`);
        return await client.create(obj);
    } catch (error) {
        Log(`Exception in kube.ApplyObject: kind: ${obj.kind}, name: ${obj.metadata.name}:  ${error.message}`);
    }
}

export async function ApplyYaml(yamldoc) {
    let obj = yaml.parse(yamldoc);
    return await ApplyObject(obj);
}
