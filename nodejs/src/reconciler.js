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

import { Service, Listener } from "./listeners.js";
import { WatchConfigMaps, WatchSites, GetConfigmaps } from "./kube.js";
import { Log }               from "./log.js";

const META_LABEL = "skupper.io/dynamic-multichannel";
var services = {};

const reconcileConfig = async function() {
    var probationServices = {};
    for (const [name, obj] of Object.entries(services)) {
        probationServices[name] = obj;
    }

    let   myCmaps = [];
    const cmaps   = await GetConfigmaps();

    for (const cm of cmaps) {
        if (cm.metadata.labels && cm.metadata.labels[META_LABEL]) {
            myCmaps.push(cm);
        }
    }

    for (const cm of myCmaps) {
        const name = cm.metadata.name;
        delete probationServices[name];
        if (!services[name]) {
            services[name] = new Service(name, cm.data);
        }
    }

    for (const [name, obj] of Object.entries(probationServices)) {
        delete services[name];
        obj.destroy();
    }
}

const getRoutingKeys = function(siteStatus) {
    let keys    = [];
    const netsites = siteStatus.network;
    for (const netsite of netsites) {
        if (netsite.services) {
            for (const netsiteservice of netsite.services) {
                if (netsiteservice.connectors) {
                    keys.push(netsiteservice.routingKey);
                }
            }
        }
    }

    return keys;
}

const reconcileKeys = async function() {

}

const onConfigWatch = async function(action, config) {
    if (config.metadata.labels && config.metadata.labels[META_LABEL]) {
        await reconcileConfig();
    }
}

const onSiteWatch = async function(action, site) {
    //
    // Get all of the current connector routing keys in the network
    //
    const keys = getRoutingKeys(site.status);

    //
    //
    //
    for (const svc of Object.values(services)) {
        const [toAdd, toDel] = svc.reconcileKeys(keys);
    }
}

export async function ReconcilerStart() {
    //
    // First, load the desired service state from the config maps.
    //
    reconcileConfig();

    //
    // Establish watches to detect changes in configuration and the set of routing keys.
    //
    WatchConfigMaps(onConfigWatch);
    WatchSites(onSiteWatch);
}
