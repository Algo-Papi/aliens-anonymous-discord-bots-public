export const SCAN_OPENERS = Object.freeze([
  "Agent J ran the deluxe scan. Bad news: the scanner works. Worse news: it found you.",
  "Agent J checked the readout twice. Not because it was wrong—because this level of nonsense deserved an encore.",
  "Subject scanned clean. Then the machine sobered up and tried again.",
  "Agent J brought the good scanner, the good suit, and exactly zero patience for this anatomy.",
  "The scanner says extraterrestrial. Agent J says embarrassing. Both findings are now official.",
  "Field note: the subject is technically alive. Agent J is appealing the decision.",
  "The readout came back classified, disrespectful, and somehow sticky.",
  "Agent J reviewed the scan, adjusted the suit, and concluded the operation needed better tailoring.",
  "Agent J tapped the scanner twice. The first reading was obscene; the second one had legal representation.",
  "The machine identified the subject, screamed internally, and requested transfer to a quieter species.",
  "Scan complete. Agent J has seen cleaner anatomy assembled behind a gas station during a hurricane.",
  "Agent J found the manufacturer's label. It says decorative human, hand wash only, no refunds.",
  "The scanner produced a threat profile and a coupon for emergency veterinary services.",
]);

export const MEMORY_OPENERS = Object.freeze([
  "Agent J opened the file and immediately understood why somebody tried to erase it.",
  "Memory recovered. Dignity remains missing and is presumed armed.",
  "Agent J restored the footage. The footage requested witness protection.",
  "The neuralyzer missed a spot. Naturally, it was the worst spot.",
  "Recovered clean, reviewed dirty, and filed under “do not let K see this.”",
  "Agent J has seen alien autopsies with healthier plot development.",
  "The memory came back in full color. Unfortunately, so did the shame.",
  "Agent J recovered the truth. The subject would like to return it unopened.",
  "Agent J restored the missing hours. Several of them are pregnant and none will name the father.",
  "The neural scar opened cleanly. What crawled out has already retained counsel.",
  "Memory recovery succeeded. The Bureau now understands why your subconscious kept a loaded weapon.",
  "The erased footage returned with subtitles, medical debt, and a warning not to pause at 3:17.",
  "Agent J recovered the memory from a part of your brain zoned exclusively for bad decisions.",
]);

export const THREAT_OPENERS = Object.freeze([
  "Agent J read the numbers, looked at the subject, and lowered the estimate out of professional courtesy.",
  "Threat rating confirmed. Swagger rating denied at the federal level.",
  "The Bureau asked for an objective assessment. Agent J laughed and did a better one.",
  "Subject may be dangerous—mostly to group morale and upholstered furniture.",
  "Agent J has arrested smarter life-forms in gas-station parking lots.",
  "This file says “approach with caution.” Agent J crossed out “caution.”",
  "Threat level: loud enough to be annoying, not competent enough to be impressive.",
  "The sensors say danger. The suit says handled.",
  "Agent J ran the threat model twice. Both simulations ended with the subject losing to a locked door.",
  "Combat analysis complete. The danger is real, but so is the subject's commitment to preventable humiliation.",
  "The Bureau recommends extreme caution around anyone this poorly assembled and this aggressively confident.",
  "Threat scan finished. Agent J has seen deadlier organisms growing in the headquarters coffee machine.",
  "The subject is armed, unstable, and tragically unaware that the suit has already won.",
]);

export const REPORT_FOOTERS = Object.freeze({
  scan: entries("scan-footer", [
    "Agent J • Field tested, suit approved.",
    "Agent J scanned it twice. The second machine has requested workers' compensation.",
    "Bureau Xenobiology • If found, do not feed after midnight or before arraignment.",
    "Agent J certifies this organism as somebody else's jurisdiction.",
    "M.I.B. Field Office • Anatomy is temporary; the paperwork is forever.",
    "Scan archived under: things K told J not to lick.",
  ]),
  memory: entries("memory-footer", [
    "Agent J recovered the memory. Therapy remains outside Bureau jurisdiction.",
    "M.I.B. Neural Hygiene • Some thoughts deserve an unmarked grave.",
    "Agent J restored the truth and immediately regretted enabling backups.",
    "Memory file sealed pending counseling, litigation, and a less curious species.",
    "Bureau notice: remembering is not the same as receiving clearance.",
    "Recovered by Agent J • Dignity not included in the restoration point.",
  ]),
  threat: entries("threat-footer", [
    "Assessment by Agent J • The numbers were ugly before he got here.",
    "M.I.B. Tactical Division • Confidence is not body armor.",
    "Agent J reviewed the danger and found the subject mostly hazardous to itself.",
    "Threat file closed with the suit clean and the odds deeply disrespectful.",
    "Bureau warning: do not confuse volume with combat capability.",
    "Assessment certified by Agent J, who has arrested deadlier furniture.",
  ]),
});

export function pickVoice(pool, random) {
  if (!Array.isArray(pool) || pool.length === 0) {
    throw new TypeError("Agent J voice pool must contain at least one line.");
  }
  return pool[random.int(0, pool.length)];
}
import { entries } from "./history.js";
