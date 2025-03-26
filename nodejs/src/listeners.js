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

//
// Service
//
//   A service corresponds to a single instance of a multi-channel connector.  It represents a collection of
//   connectors and an API endpoint that can be used by a client to manage service points for available destinations.
//
export class Service {
    constructor(name, pattern) {
        this.name      = name;
        this.pattern   = pattern;
        this.listeners = {};
    }

    reconcileListenersIn(listenerCrs) {
        // TODO Reconcile the CRs (which are authoritative) to the active-state of existing listeners
        // i.e. set listeners that have corresponding CRs to active state
    }

    reconcileListenersOut(listenerCrs) {
        // TODO Reconcile the CRs with the current set of active listeners (which are authoritative).
        // Return added and deleted listeners
        return [[], []];
    }

    reconcileKeys(routingKeys) {
        // TODO Reconcile the current set of listeners to the provided set of routing keys (which are authoritative).
        // Any added listeners are initially inactive
        // Return added and deleted listeners.
        return [[], []];
    }

    destroy() {
        this.listeners = {};
    }
}

//
// Listener
//
//   A Listener tracks a potentially (if active) existing Skupper listener that is controlled by this component.
//
export class Listener {
    constructor(service, name, host, port, routingKey) {
        this.service    = service;
        this.name       = name;
        this.host       = host;
        this.port       = port;
        this.routingKey = routingKey;
        this.active     = false;
        this.metadata   = {};      // keys/values of the routingKey variables
    }

    kubeObject() {
        return {
        };
    }

    setActive(value) {
        this.active = !!value;
    }

    isActive() {
        return this.active;
    }

    getMetadata() {
        return this.metadata;
    }

    getHostPort() {
        return {
            host : this.host,
            port : this.port,
        };
    }
}
