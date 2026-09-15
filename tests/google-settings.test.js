import test from 'node:test';
import assert from 'node:assert/strict';
import {GoogleSettingsRepository} from '../src/services/google/GoogleSettingsRepository.js';

const config={clientId:'123-test.apps.googleusercontent.com',apiKey:'AIza'+'a'.repeat(30),appId:'123'};
test('Google project settings validate matching public identifiers and exclude extra secrets',()=>{
  assert.deepEqual(GoogleSettingsRepository.validate({...config,clientId:' '+config.clientId+' ',clientSecret:'never persist this'}),config);
  for(const invalid of [{appId:'project-name'},{appId:'456'},{clientId:'secret'},{apiKey:'GOCSPX-secret'}])assert.throws(()=>GoogleSettingsRepository.validate({...config,...invalid}));
});
test('unavailable browser storage reports a recoverable settings error',async()=>{
  const repo=new GoogleSettingsRepository({indexedDB:null});await assert.rejects(repo.get());await assert.rejects(repo.save(config));await assert.rejects(repo.clear());
});
