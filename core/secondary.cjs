'use strict';
// Rotating providers may block automated requests. Fail closed rather than show
// a normal Rift page as data for another mode. These modes remain guide links.
function normalizeMobalytics(){throw new Error('This mode is available through its source guide. Automated build extraction is not verified for this source.');}
function normalizeMetasrc(){throw new Error('This rotating mode uses a source guide. Check the guide’s patch and queue availability before using its build.');}
module.exports={normalizeMobalytics,normalizeMetasrc};
