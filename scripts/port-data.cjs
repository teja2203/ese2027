/* Convert legacy global-script data.js into an ESM module.
   Content is preserved byte-for-byte; only declarations gain `export`. */
const fs = require('fs')

const src = fs.readFileSync('js/data.js', 'utf8')

const out =
  '// Ported verbatim from legacy/js/data.js (ESE2027 v63). ' +
  'Do not hand-edit the content below; regenerate with scripts/port-data.cjs.\n' +
  '// @ts-nocheck — legacy data script; types are applied at the consumer boundary.\n' +
  src
    .replace(
      /^const (SLOTS|DATA|WD|MON|ANALOGS|COA|MEAS|MATSCI|ESE14|SCHED|JUMPS) =/gm,
      'export const $1 ='
    )
    .replace(/^let (GEN) =/m, 'export let $1 =')
    .replace(
      /^function (pad2|dLabel|eachDay|studyDay|mockDay|examDay|restDay|revDay|grandTestDay|subjectMockMarathonDay|pyqSprintDay|taperDay|subjectBlock|rotatingRevision|baseSubj)\(/gm,
      'export function $1('
    )

fs.writeFileSync('src/data.ts', out, 'utf8')
console.log('src/data.ts written,', out.length, 'bytes')