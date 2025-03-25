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

//
// This component is a service that runs as a front-end proxy for inbound web requests.
// It's purpose is to redirect web requests to the appropriate Skupper service based on
// the absense, presense, and content ot he 'x-country'code' header in the request.
//

"use strict";

const express = require('express');
const axios   = require('axios');
const morgan  = require('morgan');

const IN_PORT  = 8000;
const OUT_PORT = 8000;

const app          = express();
const defaultHost  = 'processor';
const countryTable = {
    CH : 'processor-ch',
    GB : 'processor-gb',
};

const dispatchRequest = async function(req, res) {
    const id             = req.query.id;
    const dispatchHeader = req.headers['x-country-code'];
    const targetHost     = countryTable[dispatchHeader ? dispatchHeader.toUpperCase() : null] || defaultHost;
    const url            = `http://${targetHost}:${OUT_PORT}/post_work?id=${id}`;
    const response       = await axios.get(url);
    res.status(response.status).send(response.data);
}

app.use(morgan(':remote-addr :remote-user :method :url :status :res[content-length] :response-time ms'));
app.get('/post_work', async (req, res) => {
    await dispatchRequest(req, res);
});
app.get('/healthz', (req, res) => {
    res.status(200).send('Ok');
});

let server = app.listen(IN_PORT, () => {
    let host = server.address().address;
    let port = server.address().port;
    if (host[0] == ':') {
        host = '[' + host + ']';
    }
    console.log(`Dispatch Server listening on http://${host}:${port}`);
});
