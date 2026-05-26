/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, obsidianmd/rule-custom-message */

export const LOG_LEVELS = [
	"DEBUG",
	"INFO",
	"WARN",
	"ERROR",
	// Some features log data
	"FEAT",
] as const;
export type LogLevels = (typeof LOG_LEVELS)[number];

const LEVEL_COLOURS: Record<LogLevels, string | null> = {
	DEBUG: "#999",
	INFO: null,
	WARN: "#f90",
	ERROR: "#f00",
	FEAT: "#0f0",
};

const build_prefix = (level: LogLevels) => {
	const colour = LEVEL_COLOURS[level];

	const prefix = `[BC:${level}][${new Date().toISOString().split("T")[1]}]`;

	return [
		colour ? `%c${prefix}` : prefix,
		colour ? `color: ${LEVEL_COLOURS[level]};` : "",
		"\n",
	];
};

class Logger {
	level_i!: number;

	constructor(level: LogLevels) {
		this.set_level(level);
	}

	debug(...args: any[]) {
		if (this.level_i <= 0) {
			console.log(...build_prefix("DEBUG"), ...args);
		}
	}

	info(...args: any[]) {
		if (this.level_i <= 1) {
			console.log(...build_prefix("INFO"), ...args);
		}
	}

	warn(...args: any[]) {
		if (this.level_i <= 2) {
			// NOTE: Don't actually console.warn
			// The user doesn't need a stack trace
			console.log(...build_prefix("WARN"), ...args);
		}
	}

	error(...args: any[]) {
		if (this.level_i <= 3) {
			console.log(...build_prefix("ERROR"), ...args);
		}
	}

	feat(...args: any[]) {
		if (this.level_i <= 4) {
			console.log(...build_prefix("FEAT"), ...args);
		}
	}

	set_level(level: LogLevels) {
		this.level_i = LOG_LEVELS.findIndex((l) => l === level);
	}
}

export const log = new Logger("INFO");
