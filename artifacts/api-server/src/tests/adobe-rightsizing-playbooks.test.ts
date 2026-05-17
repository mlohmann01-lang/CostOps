import test from "node:test"; import assert from "node:assert/strict";
import { adobeAcrobatProRightsize, adobeAllAppsToSingleAppRightsize } from "../lib/playbooks/adobe-phase-b-playbooks";
test("all apps single app creates candidate",()=>{ const r=adobeAllAppsToSingleAppRightsize.evaluate({email:"a@b.com",displayName:"A",assignedLicenses:["CREATIVE_CLOUD_ALL_APPS"],usedApps:["PHOTOSHOP"]}); assert.equal(r.matched,true); });
test("acrobat pro low usage creates candidate",()=>{ const r=adobeAcrobatProRightsize.evaluate({email:"a@b.com",displayName:"A",assignedLicenses:["ACROBAT_PRO"],usedApps:["ACROBAT_READER"]}); assert.equal(r.matched,true); });
