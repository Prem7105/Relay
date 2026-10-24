// Run only against an isolated demo server: RELAY_TEST_URL=http://localhost:3100 node scripts/smoke-test.mjs
import assert from 'node:assert/strict';
const base = process.env.RELAY_TEST_URL;
if (!base) throw new Error('Set RELAY_TEST_URL to an isolated demo server. This test resets its data.');
async function action(body, user = 'prem', expected = 200) {
  const response = await fetch(`${base}/api/action`, {method: 'POST', headers: {'Content-Type': 'application/json', 'x-relay-user': user}, body: JSON.stringify(body)});
  const result = await response.json();
  assert.equal(response.status, expected, JSON.stringify(result));
  return result;
}
async function state(user = 'prem') {
  const response = await fetch(`${base}/api/state`, {headers: {'x-relay-user': user}});
  assert.equal(response.status, 200);
  return response.json();
}
await action({type: 'reset'});
await action({type: 'unsupported'}, 'prem', 400);
const before = (await state()).runs.length;
const {runId} = await action({type: 'loadStationeryDemo'});
let run = (await state()).runs.find(r => r.id === runId);
assert.equal((await state()).runs.length, before + 1);
assert.equal(run.requests.length, 3);
await action({type: 'decide', requestId: run.requests[0].id, accept: 'yes'}, 'prem', 400);
await action({type: 'lockRun', runId}, 'aryan', 403);
for (const q of run.requests) await action({type: 'decide', requestId: q.id, accept: true});
await action({type: 'lockRun', runId});
await action({type: 'setItem', itemId: run.requests[0].items[0].id, actualPaise: 6100}, 'prem', 400);
for (const [index, q] of run.requests.entries()) await action({type: 'setItem', itemId: q.items[0].id, actualPaise: [5000,2000,3000][index]});
await action({type: 'cancelRun', runId}, 'prem', 400);
await action({type: 'markReady', runId});
let fees = 0;
for (const q of run.requests) {
  const own = (await state(q.userId)).runs.find(r => r.id === runId).requests[0];
  assert.ok(own.pickupCode);
  assert.equal((await state()).runs.find(r=>r.id===runId).requests.find(r=>r.id===q.id).pickupCode, undefined);
  await action({type: 'collect', requestId:q.id, code:'invalid'}, 'prem', 400);
  await action({type: 'collect', requestId:q.id, code:own.pickupCode});
  const collected = (await state()).runs.find(r=>r.id===runId).requests.find(r=>r.id===q.id);
  assert.equal(collected.paymentStatus, 'UNPAID');
  await action({type:'markPaid', requestId:q.id});
  await action({type:'collect', requestId:q.id, code:own.pickupCode}, 'prem', 400);
  fees += own.billFeePaise;
}
assert.equal(fees, 1500);
assert.equal((await state()).runs.find(r=>r.id===runId).status, 'COMPLETED');
const second = await action({type:'loadStationeryDemo'});
run = (await state()).runs.find(r=>r.id===second.runId);
await action({type:'decide',requestId:run.requests[0].id,accept:true});
await action({type:'lockRun',runId:run.id});
await action({type:'setItem',itemId:run.requests[0].items[0].id,skipped:true});
await action({type:'cancelRun',runId:run.id});
assert.equal((await state()).runs.find(r=>r.id===run.id).status,'CANCELLED');
const third = await action({type:'loadStationeryDemo'});
run = (await state()).runs.find(r=>r.id===third.runId);
await action({type:'decide',requestId:run.requests[0].id,accept:true});
await action({type:'lockRun',runId:run.id});
await action({type:'setItem',itemId:run.requests[0].items[0].id,skipped:true});
await action({type:'markReady',runId:run.id});
run = (await state()).runs.find(r=>r.id===run.id);
assert.equal(run.status,'COMPLETED');
assert.equal(run.requests[0].billTotalPaise,0);
console.log('PASS: preset, validation, ownership, budget, payment separation, pickup codes, earnings, skip-only cancellation and zero-charge unfulfilled requests');
