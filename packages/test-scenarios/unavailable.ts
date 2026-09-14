import {connectMcp} from './client.js';
import assert from 'node:assert/strict';
const {client,call}=await connectMcp();
try{await assert.rejects(call('world.get_summary'),/SERVER_UNAVAILABLE_OR_OUTCOME_UNKNOWN: start the local Paper server/);console.log('PASS readable real MCP error with server stopped');}finally{await client.close();}
