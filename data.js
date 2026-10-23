/* Practical ISO metric thread selection. Sizes and pitch values are millimetres.
 * 'coarseDrill' is a common cutting-tap chart recommendation, not an ISO tolerance limit.
 * Extra pitch combos without published recommendation are marked as calculated D - P.
 * Only cutting taps. Forming taps require different holes and manufacturer data.
 */
(() => {
'use strict';
const rows = [
  [1, .25, [.2], .75],
  [1.2, .25, [.2], .95],
  [1.4, .3, [.2], 1.1],
  [1.6, .35, [.2], 1.25],
  [1.8, .35, [.2], 1.45],
  [2, .4, [.25], 1.6],
  [2.2, .45, [.25], 1.75],
  [2.5, .45, [.35], 2.05],
  [3, .5, [.35], 2.5],
  [3.5, .6, [.35], 2.9],
  [4, .7, [.5], 3.3],
  [4.5, .75, [.5], 3.75],
  [5, .8, [.5], 4.2],
  [6, 1, [.75, .5], 5],
  [7, 1, [.75], 6],
  [8, 1.25, [1, .75], 6.8],
  [9, 1.25, [1], 7.75],
  [10, 1.5, [1.25, 1, .75], 8.5],
  [11, 1.5, [1.25, 1], 9.5],
  [12, 1.75, [1.5, 1.25, 1], 10.2],
  [14, 2, [1.5, 1.25, 1], 12],
  [16, 2, [1.5, 1.25, 1], 14],
  [18, 2.5, [2, 1.5, 1], 15.5],
  [20, 2.5, [2, 1.5, 1], 17.5],
  [22, 2.5, [2, 1.5], 19.5],
  [24, 3, [2, 1.5, 1], 21],
  [27, 3, [2, 1.5], 24],
  [30, 3.5, [3, 2, 1.5], 26.5],
  [33, 3.5, [2, 1.5], 29.5],
  [36, 4, [3, 2, 1.5], 32],
  [39, 4, [3, 2], 35],
  [42, 4.5, [3, 2], 37.5],
  [45, 4.5, [3, 2], 40.5],
  [48, 5, [3, 2], 43],
  [52, 5, [4, 3], 47],
  [56, 5.5, [4, 3], 50.5],
  [60, 5.5, [4, 3], 54.5],
  [64, 6, [4, 3], 58]
];
const POPULAR = [3,4,5,6,8,10,12,14,16,18,20,24,27,30,33,36];
const KNOWN_FINE = {
  '6:0.75': 5.25, '8:1': 7, '8:0.75': 7.25,
  '10:1.25': 8.8, '10:1': 9, '10:0.75': 9.25,
  '12:1.5': 10.5, '12:1.25': 10.8, '12:1': 11,
  '14:1.5': 12.5, '14:1.25': 12.8, '14:1': 13,
  '16:1.5': 14.5, '16:1.25': 14.8, '16:1': 15,
  '18:2': 16, '18:1.5': 16.5, '18:1': 17,
  '20:2': 18, '20:1.5': 18.5, '20:1': 19,
  '22:2': 20, '22:1.5': 20.5,
  '24:2': 22, '24:1.5': 22.5, '24:1': 23,
  '27:2': 25, '27:1.5': 25.5,
  '30:3': 27, '30:2': 28, '30:1.5': 28.5,
  '33:2': 31, '33:1.5': 31.5,
  '36:3': 33, '36:2': 34, '36:1.5': 34.5,
  '39:3': 36, '39:2': 37, '42:3': 39, '42:2': 40,
  '45:3': 42, '45:2': 43, '48:3': 45, '48:2': 46,
  '52:4': 48, '52:3': 49, '56:4': 52, '56:3': 53,
  '60:4': 56, '60:3': 57, '64:4': 60, '64:3': 61
};
const THREADS = Object.freeze(rows.map(([d,coarse,fine,coarseDrill]) => Object.freeze({
  d, coarse, fine: Object.freeze(fine), coarseDrill
})));
function round(value, digits=2) { const pow=10**digits; return Math.round((value + Number.EPSILON)*pow)/pow; }
function findThread(d) { return THREADS.find(t=>t.d===Number(d)) ?? null; }
function drillFor(d,p) {
  d=Number(d); p=Number(p);
  if (!Number.isFinite(d)||!Number.isFinite(p)||d<=0||p<=0||p>=d) return null;
  const entry=findThread(d);
  if (entry && p===entry.coarse) return {diameter:entry.coarseDrill, chart:true,method:'Табличный размер'};
  const known=KNOWN_FINE[`${d}:${p}`];
  if (known!==undefined) return {diameter:known,chart:true,method:'Табличный размер'};
  return {diameter:round(d-p),chart:false,method:'Расчёт D − P'};
}
const data={THREADS,POPULAR,findThread,drillFor};
if (typeof window!=='undefined') window.CNC_THREAD_DATA=data;
if (typeof module!=='undefined' && module.exports) module.exports=data;
})();
