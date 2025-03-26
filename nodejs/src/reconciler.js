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
import { LoadConfigmap, GetSites }     from "./kube.js";
import { Log }               from "./log.js";

const CONFIG_MAP_NAME = "dynamic-multichannel";

var services = {};

const reconcileConfig = async function() {
    try {
        var probationServices = {};
        for (const [name, obj] of Object.entries(services)) {
            probationServices[name] = obj;
        }

        const config = await LoadConfigmap(CONFIG_MAP_NAME);
        for (const [key, value] of Object.entries(config.data)) {
            probationServices.delete(key);
            if (!services[key]) {
                services[key] = new Service(key, value);
            }
        }

        for (const [name, obj] of Object.entries(probationServices)) {
            services.delete(name);
            obj.destroy();
        }
    } catch (error) {
        Log(`Configmap ${CONFIG_MAP_NAME} not found`);
    }
}

const getRoutingKeys = async function() {
    let keys    = [];
    const sites = await GetSites();
    if (sites.length > 1) {
        Log(`Expecting no more than one site, got ${sites.length}`);
    } else if (sites.length == 1) { 
        const site = sites[0];
        try {
            const netsites = site.status.network;
            for (const netsite of netsites) {
                if (netsite.services) {
                    for (const netsiteservice of netsite.services) {
                        if (netsiteservice.connectors) {
                            keys.push(netsiteservice.routingKey);
                        }
                    }
                }
            }
        } catch (error) {
            Log(`Exception caught while extracting routing keys from site ${site.metadata.name}: ${error.message}`);
        }
    }

    return keys;
}

const reconcileKeys = async function() {

}

export async function ReconcilerStart() {
    //
    // First, load the desired state from the config map and the current routing keys.
    //
    await reconcileConfig();
    const keys = await getRoutingKeys();
    console.log(keys);

    //
    // Next, reconcile inbound to set the active flag on listeners that have corresponding CRs.
    //

    //
    // Establish watches to detect changes in configuration and the set of routing keys.
    //
}
