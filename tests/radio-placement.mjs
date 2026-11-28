import assert from 'node:assert/strict';
import fs from 'node:fs';
import {radioPlacement} from '../src/ui/radio.js';

// 375×812 모바일: 무전 창 높이 110, 상단 바 50. 아래 판 속 가족 칸을 밝히면 무전 창은 위로 간다.
const mobile={height:110,viewport:812,topBar:50};
assert.equal(radioPlacement({top:600,bottom:800},mobile),'top','family cards in the bottom sheet are not covered');
assert.equal(radioPlacement({top:60,bottom:110},mobile),'bottom','input box at the top keeps the radio at the bottom');
assert.equal(radioPlacement({top:40,bottom:800},mobile),'bottom','a hole covering both places keeps the usual place');
assert.equal(radioPlacement(null,mobile),'bottom');
assert.equal(radioPlacement({top:600,bottom:800},{...mobile,height:0}),'bottom','hidden radio');
// 데스크톱 1440×900: 화면 가운데 구멍은 무전 창 자리와 겹치지 않으므로 그대로 아래
assert.equal(radioPlacement({top:200,bottom:600},{height:120,viewport:900,topBar:44}),'bottom');
// 튜토리얼 4/4는 구멍을 켜기 전에 가족 칸을 아래 판 안에서 보이게 스크롤한다
const tutorial=fs.readFileSync(new URL('../src/ui/tutorial.js',import.meta.url),'utf8');
assert.ok(/scrollIntoView\(\{block:'nearest'\}\);\s*\n\s*radio\.spot\(areaOf\(HOOKS\.familyHead/.test(tutorial),'family cards scrolled into view before the spotlight');
console.log('PASS: radio moves above a covered spotlight (mobile tutorial 4/4) and stays at the bottom otherwise; family cards scrolled into view.');
