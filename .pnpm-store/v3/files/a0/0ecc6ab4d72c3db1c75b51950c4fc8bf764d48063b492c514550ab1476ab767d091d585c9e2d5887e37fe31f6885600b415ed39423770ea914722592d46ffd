import { v } from "convex/values";
export const DEFAULT_LOG_LEVEL = "WARN";
// NOTE: the ordering here is important! A config level of "INFO" will log
// "INFO", "REPORT", "WARN",and "ERROR" events.
export const logLevel = v.union(v.literal("DEBUG"), v.literal("TRACE"), v.literal("INFO"), v.literal("REPORT"), v.literal("WARN"), v.literal("ERROR"));
const logLevelOrder = logLevel.members.map((l) => l.value);
const logLevelByName = logLevelOrder.reduce((acc, l, i) => {
    acc[l] = i;
    return acc;
}, {});
export function shouldLog(config, level) {
    return logLevelByName[config] <= logLevelByName[level];
}
const DEBUG = logLevelByName["DEBUG"];
const TRACE = logLevelByName["TRACE"];
const INFO = logLevelByName["INFO"];
const REPORT = logLevelByName["REPORT"];
const WARN = logLevelByName["WARN"];
const ERROR = logLevelByName["ERROR"];
export function createLogger(level) {
    const logLevel = level ?? DEFAULT_LOG_LEVEL;
    const levelIndex = logLevelByName[logLevel];
    if (levelIndex === undefined) {
        throw new Error(`Invalid log level: ${logLevel}`);
    }
    return {
        logLevel,
        debug: (...args) => {
            if (levelIndex <= DEBUG) {
                console.debug(...args);
            }
        },
        log: (...args) => {
            if (levelIndex <= INFO) {
                console.log(...args);
            }
        },
        info: (...args) => {
            if (levelIndex <= INFO) {
                console.info(...args);
            }
        },
        warn: (...args) => {
            if (levelIndex <= WARN) {
                console.warn(...args);
            }
        },
        error: (...args) => {
            if (levelIndex <= ERROR) {
                console.error(...args);
            }
        },
        time: (label) => {
            if (levelIndex <= TRACE) {
                console.time(label);
            }
        },
        timeEnd: (label) => {
            if (levelIndex <= TRACE) {
                console.timeEnd(label);
            }
        },
        event: (event, payload) => {
            const fullPayload = {
                component: "workflow",
                event,
                ...payload,
            };
            if (levelIndex === REPORT && event === "report") {
                console.info(JSON.stringify(fullPayload));
            }
            else if (levelIndex <= INFO) {
                console.info(JSON.stringify(fullPayload));
            }
        },
    };
}
//# sourceMappingURL=logging.js.map