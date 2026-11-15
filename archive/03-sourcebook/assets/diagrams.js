/**
 * Sourcebook mechanism plates.
 *
 * These are explanatory schematics, not live device states or measurements.
 * Content: public Nixcare, Aloha and nixos-config source; Hack-A-Bot CV entry.
 * The containing page owns the step controls and motion preferences.
 */

export const diagramStages = {
  nixcare: [
    {
      title: 'Inspect',
      text: 'Check local Nix health and discover upstream input revisions before preparing a change.',
    },
    {
      title: 'Build a candidate',
      text: 'Build from an isolated configuration snapshot, keeping the proposed change separate from the active system.',
    },
    {
      title: 'Apply explicitly',
      text: 'The user applies the exact candidate that built successfully. Stale candidates are refused; activation is never automatic.',
    },
  ],
  aloha: [
    {
      title: 'Understand the need',
      text: 'Read demonstration maintenance needs together with procedure and alarm history.',
    },
    {
      title: 'Find a usable window',
      text: 'The rule-based planner rejects conflicts or missing data, then accounts for recovery margin and backup.',
    },
    {
      title: 'Ask a human',
      text: 'Require explicit human clearance and a surroundings check before a simulated handover or action.',
    },
  ],
  robotics: [
    {
      title: 'Human input',
      text: 'Marc designed and built the gesture interface; teammates developed the voice-control channel.',
    },
    {
      title: 'Combine the controls',
      text: 'The team brought gesture and voice control together in a humanoid robot control concept.',
    },
    {
      title: 'Demonstrate the idea',
      text: 'A cath-lab demonstration made the interaction tangible. Marc also led the team and final pitch.',
    },
  ],
  nixos: [
    {
      title: 'Sense the hinge',
      text: 'An Intel IIO sensor supplies the convertible laptop’s hinge angle.',
    },
    {
      title: 'Decide the mode',
      text: 'Hysteresis separates tablet entry at 190° or more from laptop return at 1–175°, avoiding rapid mode switching.',
    },
    {
      title: 'Adapt the inputs',
      text: 'Hyprland enables or disables the keyboard, touchpad and TrackPoint to match the selected mode. A manual override remains available.',
    },
  ],
};

const C = {
  ink: '#22251f',
  muted: '#8b8e83',
  line: '#b9bcb0',
  paper: '#f4f2eb',
  white: '#faf9f4',
  lime: '#dcf284',
  orange: '#e97945',
};

let serial = 0;
const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const n = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(2, Math.trunc(Number(value)))) : 0;
const text = (x, y, value, opts = {}) =>
  `<text x="${x}" y="${y}" fill="${opts.color || C.ink}" font-size="${opts.size || 13}" font-weight="${opts.weight || 500}"${opts.mono ? ' font-family="JetBrains Mono, ui-monospace, monospace"' : ''}${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''}>${esc(value)}</text>`;
const mono = (x, y, value, opts = {}) => text(x, y, value, { size: 10, mono: true, color: C.muted, ...opts });
const stroke = (d, opts = {}) =>
  `<path d="${d}" fill="${opts.fill || 'none'}" stroke="${opts.color || C.ink}" stroke-width="${opts.width || 1.35}" stroke-linecap="round" stroke-linejoin="round"${opts.dash ? ` stroke-dasharray="${opts.dash}"` : ''}${opts.marker ? ` marker-end="url(#${opts.marker})"` : ''}${opts.opacity ? ` opacity="${opts.opacity}"` : ''}/>`;
const dot = (x, y, r = 3, color = C.ink) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const rect = (x, y, w, h, opts = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.radius || 0}" fill="${opts.fill || 'none'}" stroke="${opts.stroke || C.ink}" stroke-width="${opts.width || 1.2}"${opts.dash ? ` stroke-dasharray="${opts.dash}"` : ''}/>`;
const group = (index, active, content) =>
  `<g class="diagram-stage diagram-stage-${index}${index === active ? ' is-active' : ''}" data-diagram-stage="${index}" opacity="${index === active ? 1 : 0.76}">${content}</g>`;
const step = (x, y, index, active, label) =>
  `<g>${dot(x + 10, y - 4, 10, index === active ? C.ink : C.paper)}<circle cx="${x + 10}" cy="${y - 4}" r="10" fill="none" stroke="${index === active ? C.ink : C.line}"/>${mono(x + 10, y - 1, `${index + 1}`, { size: 9, anchor: 'middle', color: index === active ? C.lime : C.muted })}${mono(x + 28, y, label, { color: index === active ? C.ink : C.muted, size: 10 })}</g>`;
const activeFill = (stepIndex, active) => stepIndex === active ? C.lime : C.white;

function definitions(uid) {
  return `<defs>
    <pattern id="${uid}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.line}" stroke-width=".45" opacity=".45"/></pattern>
    <pattern id="${uid}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V6" stroke="${C.ink}" stroke-width=".6" opacity=".24"/></pattern>
    <marker id="${uid}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="m1 1 5 3-5 3" fill="none" stroke="${C.ink}" stroke-width="1.1"/></marker>
    <marker id="${uid}-orange-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="m1 1 5 3-5 3" fill="none" stroke="${C.orange}" stroke-width="1.1"/></marker>
  </defs>`;
}

function frame(uid, label, rightLabel) {
  return `<rect width="660" height="480" fill="${C.paper}"/>
    <rect x="24" y="61" width="612" height="361" fill="url(#${uid}-grid)" opacity=".58"/>
    ${stroke('M24 49H636M24 432H636', { color: C.line, width: .8 })}
    ${mono(24, 30, label, { color: C.ink, size: 10, spacing: 1 })}
    ${mono(636, 30, rightLabel, { anchor: 'end', size: 9 })}
    ${stroke('M24 73V61H36M624 61H636V73M24 410V422H36M624 422H636V410', { color: C.muted, width: .8 })}`;
}

function nixcare(active, uid) {
  const arrow = `${uid}-arrow`;
  return `${frame(uid, 'THE ANATOMY OF A DELIBERATE UPDATE', 'NIXCARE / SYSTEM MAINTENANCE')}
    ${step(34, 88, 0, active, 'INSPECT')}
    ${step(243, 88, 1, active, 'BUILD CANDIDATE')}
    ${step(473, 88, 2, active, 'EXPLICIT APPLY')}
    ${group(0, active, `
      ${rect(44, 133, 148, 167, { fill: activeFill(0, active) })}
      ${rect(54, 123, 148, 167, { fill: activeFill(0, active) })}
      ${rect(64, 113, 148, 167, { fill: activeFill(0, active) })}
      ${mono(78, 136, 'LOCAL CONFIGURATION', { color: C.ink, size: 9 })}
      ${stroke('M78 150H193', { color: C.line, width: .8 })}
      ${text(78, 174, 'Health checks', { size: 15, weight: 600 })}
      ${stroke('m79 196 4 4 8-9M100 196H177m-98 23 4 4 8-9M100 219H167m-88 23 4 4 8-9M100 242H185', { width: 1.3 })}
      ${mono(73, 322, 'UPSTREAM INPUTS')}
      ${dot(80, 343, 4, C.orange)}${dot(119, 343, 4, C.orange)}${dot(158, 343, 4, C.orange)}
      ${stroke('M84 343H115M123 343H154M162 343H216V229H246', { color: C.orange, width: 1.25, marker: `${uid}-orange-arrow` })}
      ${mono(73, 371, 'Discover revisions', { size: 10, color: C.ink })}
    `)}
    ${stroke('M214 178H244', { marker: arrow })}
    ${group(1, active, `
      ${rect(249, 115, 198, 242, { fill: C.paper, stroke: C.muted, dash: '5 6' })}
      ${mono(262, 137, 'ISOLATED SNAPSHOT', { size: 9, color: C.ink })}
      ${stroke('M264 264 346 299 431 261 350 229Z', { fill: `url(#${uid}-hatch)`, color: C.line })}
      ${stroke('M264 241 346 276 431 238 350 206Z', { fill: C.paper, color: C.muted })}
      ${stroke('M264 218 346 253 431 215 350 183Z', { fill: activeFill(1, active), width: 1.5 })}
      ${stroke('M346 253V299M264 218V264M431 215V261', { dash: '2 4', color: C.muted, width: .8 })}
      ${text(347, 224, 'candidate', { size: 16, weight: 600, anchor: 'middle' })}
      ${mono(348, 325, 'BUILD BEFORE ACTIVATION', { size: 9, color: C.ink, anchor: 'middle' })}
      ${stroke('M290 157H406M290 153V161M406 153V161', { color: C.muted, width: .8 })}
    `)}
    ${stroke('M447 218H477', { marker: arrow })}
    ${group(2, active, `
      ${rect(485, 153, 136, 98, { fill: activeFill(2, active) })}
      ${mono(553, 175, 'HUMAN DECISION', { color: C.ink, size: 9, anchor: 'middle' })}
      ${stroke('m504 204 8 8 14-17', { width: 2.2 })}
      ${text(537, 208, 'Apply', { size: 20, weight: 600 })}
      ${mono(553, 235, 'THE BUILT CANDIDATE', { color: C.ink, size: 8, anchor: 'middle' })}
      ${stroke('M553 252V289', { marker: arrow })}
      ${rect(502, 300, 103, 47, { fill: C.paper })}
      ${stroke('M518 314H589M518 324H567', { color: C.muted })}
      ${dot(589, 332, 2, C.orange)}
      ${stroke('M553 347V356M536 358H570', { width: 1.2 })}
      ${mono(553, 382, 'ACTIVE SYSTEM', { color: C.ink, size: 9, anchor: 'middle' })}
    `)}
    ${stroke('M445 274H468V387H341V361', { color: C.muted, dash: '3 5', width: .9 })}
    ${mono(343, 406, 'STALE CANDIDATE → REBUILD', { color: C.muted, size: 9, anchor: 'middle' })}
    ${mono(24, 455, 'BUILD AND ACTIVATION ARE SEPARATE DECISIONS', { color: C.ink, size: 9 })}
    ${mono(636, 455, 'NO AUTOMATIC ACTIVATION', { anchor: 'end', size: 8 })}`;
}

function aloha(active, uid) {
  const arrow = `${uid}-arrow`;
  return `${frame(uid, 'FINDING SPACE FOR MAINTENANCE', 'ALOHA / SIMULATED WORKFLOW')}
    ${step(34, 88, 0, active, 'CONTEXT')}
    ${step(258, 88, 1, active, 'RULES & WINDOW')}
    ${step(479, 88, 2, active, 'HUMAN CLEARANCE')}
    ${group(0, active, `
      ${rect(45, 133, 145, 67, { fill: activeFill(0, active) })}
      ${mono(59, 154, 'MAINTENANCE', { color: C.ink, size: 9 })}
      ${stroke('M59 172H143M59 183H173', { color: C.muted })}
      ${rect(60, 220, 145, 67, { fill: activeFill(0, active) })}
      ${mono(74, 241, 'PROCEDURE HISTORY', { color: C.ink, size: 9 })}
      ${stroke('M74 259H172M74 270H149', { color: C.muted })}
      ${rect(45, 307, 145, 67, { fill: activeFill(0, active) })}
      ${mono(59, 328, 'ALARM HISTORY', { color: C.ink, size: 9 })}
      ${stroke('M59 346H153M59 357H170', { color: C.muted })}
      ${stroke('M190 165H225V340H190M205 253H244', { color: C.muted, width: .9 })}
      ${dot(225, 253, 3)}
    `)}
    ${group(1, active, `
      <circle cx="343" cy="253" r="89" fill="${activeFill(1, active)}" stroke="${C.ink}" stroke-width="1.3"/>
      <circle cx="343" cy="253" r="72" fill="none" stroke="${C.muted}" stroke-width=".7" stroke-dasharray="2 6"/>
      ${stroke('M343 148V168M343 338V357M238 253H255M431 253H448', { color: C.ink, width: 1 })}
      ${mono(343, 219, 'RULE-BASED', { color: C.ink, size: 10, anchor: 'middle' })}
      ${text(343, 247, 'A window', { size: 25, weight: 600, anchor: 'middle' })}
      ${text(343, 275, 'that fits.', { size: 25, weight: 600, anchor: 'middle' })}
      ${mono(343, 299, 'MARGIN + BACKUP', { color: C.ink, size: 9, anchor: 'middle' })}
      ${stroke('M343 149V128H420', { color: C.muted, width: .8 })}
      ${mono(424, 131, 'Check conflicts', { size: 9, color: C.ink })}
      ${stroke('M343 357V383H272', { color: C.muted, width: .8 })}
      ${mono(343, 402, 'MISSING DATA / CONFLICT → REJECT', { size: 8.5, anchor: 'middle' })}
      ${stroke('M249 251H264', { marker: arrow })}
    `)}
    ${stroke('M450 253H483', { marker: arrow })}
    ${group(2, active, `
      ${rect(490, 175, 127, 156, { fill: activeFill(2, active) })}
      ${mono(553, 197, 'BEFORE ACTION', { color: C.ink, size: 8.5, anchor: 'middle' })}
      <circle cx="553" cy="227" r="10" fill="none" stroke="${C.ink}" stroke-width="1.5"/>
      ${stroke('M534 256V251C534 235 572 235 572 251V256', { width: 1.5 })}
      ${stroke('M506 270H601', { color: C.muted, width: .8 })}
      ${text(553, 291, 'Clearance', { size: 16, weight: 600, anchor: 'middle' })}
      ${mono(553, 313, '+ surroundings check', { color: C.ink, size: 8.5, anchor: 'middle' })}
      ${stroke('M553 333V365', { marker: arrow })}
      ${mono(553, 386, 'SIMULATED HANDOVER', { size: 8.5, anchor: 'middle', color: C.ink })}
    `)}
    ${mono(24, 455, 'PLANNING SUPPORT, WITH A PERSON IN THE LOOP', { color: C.ink, size: 9 })}
    ${mono(636, 455, 'NO LIVE CLINICAL INTEGRATION', { anchor: 'end', size: 8 })}`;
}

function robotics(active, uid) {
  const arrow = `${uid}-arrow`;
  return `${frame(uid, 'TWO HUMAN CHANNELS. ONE CONTROL CONCEPT.', 'HACK-A-BOT / TEAM PROTOTYPE')}
    ${step(34, 88, 0, active, 'HUMAN INPUT')}
    ${step(255, 88, 1, active, 'COMBINED INTERFACE')}
    ${step(477, 88, 2, active, 'DEMONSTRATION')}
    ${group(0, active, `
      ${stroke('M95 267C91 247 77 235 71 220C68 210 78 206 84 214L98 230V155C98 143 111 143 112 154L115 204V132C115 118 129 118 130 131L132 204V143C132 131 146 132 147 144L148 207V168C148 155 162 156 162 168V233C162 252 156 264 151 279L148 296H101Z', { fill: activeFill(0, active), width: 1.6 })}
      ${stroke('M110 249C119 237 138 236 150 243M117 206V222M132 207V222M148 210V224', { color: C.muted, width: .9 })}
      ${stroke('M177 144C189 165 194 189 187 211M191 136C207 162 212 188 203 217', { color: C.orange, width: 1 })}
      ${mono(118, 319, 'GESTURE INTERFACE', { anchor: 'middle', color: C.ink, size: 9 })}
      ${mono(118, 336, 'Designed & built by Marc', { anchor: 'middle', size: 8.5 })}
      ${rect(50, 357, 139, 43, { fill: C.paper, stroke: C.muted })}
      ${stroke('M66 379H74m4-7v14m6-20v27m6-33v39m6-28v17m6-23v29m6-21v13m7-7h6', { width: 1, color: C.ink })}
      ${mono(149, 376, 'VOICE', { anchor: 'middle', color: C.ink, size: 9 })}
      ${mono(149, 390, 'Team', { anchor: 'middle', size: 8 })}
    `)}
    ${stroke('M173 254H234V248H265M191 378H234V273H265', { color: C.muted, width: 1, marker: arrow })}
    ${group(1, active, `
      ${rect(277, 167, 154, 166, { fill: activeFill(1, active) })}
      ${rect(286, 158, 154, 166, { fill: activeFill(1, active) })}
      ${mono(363, 184, 'CONTROL INTERFACE', { color: C.ink, size: 9, anchor: 'middle' })}
      ${stroke('M303 197H423', { color: C.muted, width: .8 })}
      ${dot(308, 227, 4)}${dot(308, 276, 4)}
      ${stroke('M312 227H337L365 252H406M312 276H337L365 252', { width: 1.5 })}
      ${dot(365, 252, 7, C.orange)}
      ${stroke('M372 252H418', { marker: arrow })}
      ${mono(363, 309, 'GESTURE + VOICE', { color: C.ink, size: 10, anchor: 'middle' })}
      ${mono(359, 363, 'One team integration', { anchor: 'middle', color: C.ink, size: 10 })}
      ${mono(359, 380, 'Two complementary inputs', { anchor: 'middle', size: 8.5 })}
    `)}
    ${stroke('M441 252H484', { marker: arrow })}
    ${group(2, active, `
      ${rect(530, 138, 39, 39, { radius: 11, fill: activeFill(2, active), width: 1.5 })}
      ${stroke('M540 155H546M553 155H559M543 166H556', { width: 1.5 })}
      ${stroke('M547 178V189M533 190H567L579 240 568 265H532L520 240Z', { fill: activeFill(2, active), width: 1.5 })}
      ${stroke('M530 193 512 208 504 253 485 269M572 193 589 209 600 244 610 235', { width: 6, color: C.paper })}
      ${stroke('M530 193 512 208 504 253 485 269M572 193 589 209 600 244 610 235', { width: 1.5 })}
      ${stroke('M541 266 532 302 531 342 515 354M560 266 572 300 570 342 585 354', { width: 8, color: C.paper })}
      ${stroke('M541 266 532 302 531 342 515 354M560 266 572 300 570 342 585 354', { width: 1.5 })}
      ${dot(512, 208, 3)}${dot(589, 209, 3)}${dot(532, 302, 3)}${dot(572, 300, 3)}
      ${dot(550, 223, 6, C.orange)}
      ${stroke('M495 365H607', { color: C.muted, width: .9 })}
      ${mono(550, 387, 'HUMANOID DEMO', { color: C.ink, size: 9, anchor: 'middle' })}
      ${mono(550, 403, 'Cath-lab concept', { size: 9, anchor: 'middle' })}
    `)}
    ${mono(24, 455, 'MARC: GESTURE INTERFACE · TEAM LEAD · FINAL PITCH', { color: C.ink, size: 9 })}
    ${mono(636, 455, 'INTERACTION SCHEMATIC', { anchor: 'end', size: 8 })}`;
}

function nixos(active, uid) {
  const arrow = `${uid}-arrow`;
  return `${frame(uid, 'WHEN THE HARDWARE CHANGES ITS MIND', 'NIXOS / CONVERTIBLE INPUT LOGIC')}
    ${step(34, 88, 0, active, 'SENSE')}
    ${step(261, 88, 1, active, 'DECIDE')}
    ${step(478, 88, 2, active, 'ADAPT')}
    ${group(0, active, `
      <circle cx="138" cy="244" r="94" fill="none" stroke="${C.muted}" stroke-width=".7" stroke-dasharray="2 5"/>
      ${stroke('M138 158A86 86 0 1 1 53 257', { color: C.orange, width: 2 })}
      ${stroke('M54 257 49 249M54 257 62 253', { color: C.orange })}
      ${stroke('M138 139V151M138 337V349M32 244H44M231 244H244', { color: C.muted, width: .8 })}
      ${stroke('M133 238 85 164 97 156 148 231Z', { fill: activeFill(0, active), width: 1.4 })}
      ${stroke('M135 236H219V249H136Z', { fill: activeFill(0, active), width: 1.4 })}
      ${stroke('M153 242H205', { color: C.muted, width: .8 })}
      ${dot(138, 244, 10, C.paper)}
      <circle cx="138" cy="244" r="10" fill="none" stroke="${C.ink}" stroke-width="1.5"/>
      ${dot(138, 244, 3, C.orange)}
      ${stroke('M138 263V306H81', { color: C.muted, width: .8 })}
      ${mono(81, 324, 'HINGE ANGLE', { size: 9, color: C.ink })}
      ${mono(138, 375, 'Intel IIO sensor', { size: 10, color: C.ink, anchor: 'middle' })}
      ${mono(138, 393, 'A physical input to the OS', { size: 8.5, anchor: 'middle' })}
    `)}
    ${stroke('M232 244H261', { marker: arrow })}
    ${group(1, active, `
      ${rect(270, 145, 174, 193, { fill: activeFill(1, active) })}
      ${mono(357, 167, 'MODE DECISION', { color: C.ink, size: 10, anchor: 'middle' })}
      ${stroke('M288 182H426', { color: C.muted, width: .8 })}
      ${text(293, 210, 'LAPTOP', { size: 12, weight: 600 })}
      ${text(422, 210, 'TABLET', { size: 12, weight: 600, anchor: 'end' })}
      ${stroke('M297 237H416', { marker: arrow, color: C.ink })}
      ${mono(357, 230, '≥190°', { color: C.ink, size: 13, anchor: 'middle' })}
      ${stroke('M416 281H297', { marker: arrow, color: C.ink })}
      ${mono(357, 272, '1–175°', { color: C.ink, size: 13, anchor: 'middle' })}
      ${rect(322, 295, 70, 24, { fill: `url(#${uid}-hatch)`, stroke: C.muted, width: .6 })}
      ${mono(357, 311, 'HOLD MODE', { color: C.ink, size: 8, anchor: 'middle' })}
      ${mono(357, 366, 'Hysteresis', { color: C.ink, size: 11, anchor: 'middle' })}
      ${mono(357, 383, 'Separate entry / return thresholds', { size: 8.3, anchor: 'middle' })}
    `)}
    ${stroke('M446 244H474', { marker: arrow })}
    ${group(2, active, `
      ${rect(485, 151, 130, 55, { fill: activeFill(2, active) })}
      ${mono(550, 171, 'KEYBOARD', { color: C.ink, size: 9, anchor: 'middle' })}
      ${stroke('M500 183H600M500 191H600M508 181V193M520 181V193M532 181V193M544 181V193M556 181V193M568 181V193M580 181V193M592 181V193', { color: C.muted, width: .8 })}
      ${rect(485, 221, 130, 55, { fill: activeFill(2, active) })}
      ${mono(550, 241, 'TOUCHPAD', { color: C.ink, size: 9, anchor: 'middle' })}
      ${rect(533, 250, 34, 17, { radius: 3, width: .9 })}
      ${rect(485, 291, 130, 55, { fill: activeFill(2, active) })}
      ${mono(550, 312, 'TRACKPOINT', { color: C.ink, size: 9, anchor: 'middle' })}
      ${dot(550, 330, 6, C.orange)}
      ${stroke('M478 178H485M478 248H485M478 319H485M478 178V319', { color: C.muted, width: .9 })}
      ${mono(550, 372, 'Enable / disable', { color: C.ink, size: 10, anchor: 'middle' })}
      ${mono(550, 390, 'Through Hyprland', { size: 9, anchor: 'middle' })}
    `)}
    ${mono(24, 455, 'A WORKSTATION CONFIGURATION THAT KNOWS ITS HARDWARE', { color: C.ink, size: 9 })}
    ${mono(636, 455, 'MANUAL OVERRIDE AVAILABLE', { anchor: 'end', size: 8 })}`;
}

const renderers = { nixcare, aloha, robotics, nixos };
const names = {
  nixcare: 'Nixcare’s deliberate update flow',
  aloha: 'Aloha’s simulated maintenance planning flow',
  robotics: 'The Hack-A-Bot gesture and voice control concept',
  nixos: 'NixOS convertible laptop mode logic',
};

/**
 * Return an accessible, self-contained mechanism SVG inside one HTML wrapper.
 * Active stage is 0–2. Unknown project IDs safely return an empty string.
 */
export function diagramMarkup(id, active = 0) {
  if (!Object.hasOwn(renderers, id)) return '';
  const current = n(active);
  const uid = `mechanism-${id}-${++serial}`;
  const title = names[id];
  const description = diagramStages[id].map(stage => `${stage.title}. ${stage.text}`).join(' ');
  return `<div class="mechanism-diagram diagram-${id}" data-diagram="${id}" data-active-step="${current}"><svg class="mechanism-svg" viewBox="0 0 660 480" width="660" height="480" role="img" aria-labelledby="${uid}-title ${uid}-description" xmlns="http://www.w3.org/2000/svg" font-family="Manrope, Arial, sans-serif" style="display:block;width:100%;height:auto;overflow:visible"><title id="${uid}-title">${esc(title)}</title><desc id="${uid}-description">${esc(description)} Current stage: ${esc(diagramStages[id][current].title)}.</desc>${definitions(uid)}${renderers[id](current, uid)}</svg></div>`;
}

// Hinge thresholds mirror the public modules/tablet-mode.nix implementation.
// The viewer controls a model; it never reads sensors or changes device inputs.
const hingeControllers = new WeakMap();
const hingeAngle = angle => {
  const value = Number(angle);
  return Number.isFinite(value) ? Math.max(90, Math.min(300, Math.round(value))) : 135;
};
const hingeMode = (angle, previous = 'laptop') => {
  if (angle >= 190) return 'tablet';
  if (angle >= 1 && angle <= 175) return 'laptop';
  return previous === 'tablet' ? 'tablet' : 'laptop';
};

/**
 * Physical side-view of a convertible hinge, with its modeled input state.
 * Between thresholds, pass the previously selected mode to preserve hysteresis.
 */
export function renderHingeModel(angle = 135, mode = 'laptop') {
  const degrees = hingeAngle(angle);
  const current = hingeMode(degrees, mode);
  const tablet = current === 'tablet';
  const uid = `hinge-${++serial}`;
  const radians = degrees * Math.PI / 180;
  const hx = 255;
  const hy = 164;
  const radius = 77;
  const arcX = hx + Math.cos(radians) * radius;
  const arcY = hy - Math.sin(radians) * radius;
  const color = tablet ? C.orange : C.lime;
  const state = tablet ? 'Disabled' : 'Enabled';
  const hold = degrees > 175 && degrees < 190;
  const ticks = Array.from({ length: 13 }, (_, index) => {
    const rad = index * Math.PI / 6;
    return stroke(`M${hx + Math.cos(rad) * 128} ${hy - Math.sin(rad) * 128}L${hx + Math.cos(rad) * 133} ${hy - Math.sin(rad) * 133}`, { color: C.line, width: .8 });
  }).join('');
  return `<svg class="hinge-physical" viewBox="0 0 660 330" width="660" height="330" role="img" aria-labelledby="${uid}-title ${uid}-desc" xmlns="http://www.w3.org/2000/svg" font-family="Manrope, Arial, sans-serif" style="display:block;width:100%;height:auto">
    <title id="${uid}-title">A convertible hinge at ${degrees} degrees</title>
    <desc id="${uid}-desc">${current === 'tablet' ? 'Tablet' : 'Laptop'} mode. Keyboard, touchpad and TrackPoint are ${state.toLowerCase()}.${hold ? ' The angle is between the switching thresholds, so the previous mode is retained.' : ''} This is an interactive model, not your device.</desc>
    <rect width="660" height="330" fill="${C.paper}"/>
    <circle cx="${hx}" cy="${hy}" r="130" fill="none" stroke="${C.line}" stroke-width=".7" stroke-dasharray="2 6"/>
    ${ticks}
    ${stroke(`M${hx + radius} ${hy}A${radius} ${radius} 0 ${degrees > 180 ? 1 : 0} 0 ${arcX} ${arcY}`, { color: C.orange, width: 1.5 })}
    ${stroke(`M${hx} ${hy}H${hx + 111}`, { color: C.line, width: .8, dash: '2 5' })}
    <g transform="translate(${hx} ${hy}) rotate(${-degrees})">
      <rect x="2" y="-7" width="119" height="14" rx="4" fill="${color}" stroke="${C.ink}" stroke-width="1.6"/>
      ${stroke('M14 -3H108', { width: .9, color: C.ink })}
      ${dot(114, 0, 1.4)}
    </g>
    <path d="M${hx} ${hy - 5}H${hx + 126}L${hx + 139} ${hy + 4}Q${hx + 143} ${hy + 8} ${hx + 134} ${hy + 9}H${hx}Z" fill="${tablet ? C.white : C.lime}" stroke="${C.ink}" stroke-width="1.6"/>
    ${stroke(`M${hx + 22} ${hy - 1}H${hx + 108}`, { color: C.muted, width: .8 })}
    ${dot(hx, hy, 12, C.paper)}
    <circle cx="${hx}" cy="${hy}" r="12" fill="none" stroke="${C.ink}" stroke-width="1.6"/>
    ${dot(hx, hy, 4, C.orange)}
    ${stroke(`M${hx + 141} ${hy + 3}H432`, { color: C.muted, width: .9, dash: '3 5' })}
    ${mono(447, 104, 'MODELED INPUT STATE', { color: C.muted, size: 10 })}
    ${text(447, 139, tablet ? 'Tablet' : 'Laptop', { color: C.ink, size: 32, weight: 600 })}
    ${stroke('M447 154H622', { color: C.line, width: .8 })}
    ${text(447, 182, 'Keyboard', { size: 14 })}${text(622, 182, state, { size: 12, anchor: 'end', color: tablet ? C.muted : C.ink })}
    ${text(447, 212, 'Touchpad', { size: 14 })}${text(622, 212, state, { size: 12, anchor: 'end', color: tablet ? C.muted : C.ink })}
    ${text(447, 242, 'TrackPoint', { size: 14 })}${text(622, 242, state, { size: 12, anchor: 'end', color: tablet ? C.muted : C.ink })}
    ${mono(447, 281, hold ? 'BETWEEN THRESHOLDS: HOLD' : tablet ? 'TABLET ENTRY: ≥190°' : 'LAPTOP RETURN: ≤175°', { color: hold ? C.orange : C.muted, size: 9 })}
    ${mono(255, 320, 'SIDE VIEW / TURN THE HINGE BELOW', { anchor: 'middle', size: 9 })}
  </svg>`;
}

/**
 * Mount one accessible, local-only hinge demonstration.
 * Returns cleanup(); call it before a route/reader is discarded. No timers,
 * global event listeners, sensor access or device control are created.
 */
export function initHingeModel(container) {
  if (!container || typeof container.querySelector !== 'function') return () => {};
  hingeControllers.get(container)?.();
  const uid = `hinge-control-${++serial}`;
  let angle = 135;
  let mode = 'laptop';
  container.innerHTML = `<section class="hinge-interactive" data-mode="laptop" aria-labelledby="${uid}-heading" style="color:${C.ink};border-top:1px solid ${C.line};padding-top:24px;margin-top:28px">
    <span class="micro hinge-model-kicker" style="display:block;font-size:10px;letter-spacing:.08em;margin-bottom:12px">INTERACTIVE MODEL · NOT YOUR DEVICE</span>
    <h3 id="${uid}-heading" class="hinge-model-heading" style="font-size:clamp(24px,4vw,34px);line-height:1.15;font-weight:600;letter-spacing:-.035em;margin:0 0 8px">A hinge. Two modes.</h3>
    <p class="hinge-model-intro" style="max-width:54ch;font-size:14px;line-height:1.6;margin:0">Fold to 190° or more to enter tablet mode. Return to 175° or less for laptop mode. Between those thresholds, the previous mode holds.</p>
    <div class="hinge-model-visual" data-hinge-visual style="margin:12px 0">${renderHingeModel(angle, mode)}</div>
    <div class="hinge-control-heading" style="display:flex;justify-content:space-between;align-items:baseline;gap:16px"><label for="${uid}-range" style="font-size:14px;font-weight:600">Hinge angle</label><output for="${uid}-range" data-hinge-angle aria-hidden="true" style="font-size:28px;font-variant-numeric:tabular-nums;letter-spacing:-.04em">135°</output></div>
    <input class="hinge-angle-range" id="${uid}-range" type="range" min="90" max="300" step="1" value="135" aria-describedby="${uid}-help" aria-valuetext="135 degrees, laptop mode, inputs enabled" style="display:block;box-sizing:border-box;width:100%;height:44px;margin:0;accent-color:${C.ink};cursor:ew-resize">
    <div class="hinge-range-labels" aria-hidden="true" style="display:flex;justify-content:space-between;gap:8px;font-family:JetBrains Mono,ui-monospace,monospace;font-size:10px;color:${C.muted}"><span>90°</span><span>175–190° · hold zone</span><span>300°</span></div>
    <p id="${uid}-help" class="hinge-model-help" style="font-size:12px;line-height:1.5;color:${C.muted};margin:16px 0 8px">Drag the slider, or focus it and use the arrow keys. The model follows the configuration’s switching thresholds.</p>
    <p data-hinge-status role="status" aria-live="polite" style="font-size:14px;line-height:1.5;margin:0">Laptop mode. Keyboard, touchpad and TrackPoint enabled.</p>
    <button type="button" class="hinge-reset text-button" data-hinge-reset style="font:inherit;font-size:12px;line-height:1.5;color:${C.ink};background:transparent;border:0;border-bottom:1px solid ${C.line};padding:10px 0 3px;margin-top:12px;cursor:pointer">Reset to 135° <span aria-hidden="true">↺</span></button>
  </section>`;
  const root = container.querySelector('.hinge-interactive');
  const range = container.querySelector('.hinge-angle-range');
  const visual = container.querySelector('[data-hinge-visual]');
  const output = container.querySelector('[data-hinge-angle]');
  const status = container.querySelector('[data-hinge-status]');
  const reset = container.querySelector('[data-hinge-reset]');
  let lastStatus = status.textContent;

  function update() {
    angle = hingeAngle(range.value);
    mode = hingeMode(angle, mode);
    const tablet = mode === 'tablet';
    const label = tablet ? 'Tablet' : 'Laptop';
    const state = tablet ? 'disabled' : 'enabled';
    const hold = angle > 175 && angle < 190;
    const message = `${label} mode.${hold ? ' Between thresholds: the previous mode holds.' : ''} Keyboard, touchpad and TrackPoint ${state}.`;
    root.dataset.mode = mode;
    root.dataset.hold = String(hold);
    output.value = `${angle}°`;
    range.setAttribute('aria-valuetext', `${angle} degrees, ${mode} mode, inputs ${state}${hold ? ', previous mode held' : ''}`);
    visual.innerHTML = renderHingeModel(angle, mode);
    // Announce meaningful state changes; avoid narrating every slider increment.
    if (message !== lastStatus) {
      status.textContent = message;
      lastStatus = message;
    }
  }

  function resetModel() {
    range.value = '135';
    mode = 'laptop';
    update();
  }

  range.addEventListener('input', update);
  reset.addEventListener('click', resetModel);
  function cleanup() {
    range.removeEventListener('input', update);
    reset.removeEventListener('click', resetModel);
    if (hingeControllers.get(container) === cleanup) hingeControllers.delete(container);
  }
  hingeControllers.set(container, cleanup);
  return cleanup;
}
