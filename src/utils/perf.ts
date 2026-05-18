import { log } from "src/logger";

const enabled = () => log.level_i <= 0;

export function perf_start(label: string) {
	if (!enabled()) return;
	performance.mark(`bc:${label}:start`);
}

export function perf_end(label: string) {
	if (!enabled()) return;
	const start = `bc:${label}:start`;
	const end = `bc:${label}:end`;
	performance.mark(end);
	try {
		const m = performance.measure(`bc:${label}`, start, end);
		log.debug(`perf ${label}: ${m.duration.toFixed(1)}ms`);
	} catch {
		// missing start mark — ignore
	}
	performance.clearMarks(start);
	performance.clearMarks(end);
	performance.clearMeasures(`bc:${label}`);
}

export function perf_sync<T>(label: string, fn: () => T): T {
	perf_start(label);
	try {
		return fn();
	} finally {
		perf_end(label);
	}
}

const EFFECT_LOG_THRESHOLDS = [1, 10, 50, 200, 1000];

export function effect_counter(label: string) {
	let count = 0;
	let idx = 0;
	return () => {
		count++;
		while (
			idx < EFFECT_LOG_THRESHOLDS.length &&
			count >= EFFECT_LOG_THRESHOLDS[idx]
		) {
			const threshold = EFFECT_LOG_THRESHOLDS[idx];
			idx++;
			if (threshold === 1) {
				log.debug(`effect-tick "${label}" first-run`);
			} else {
				log.error(
					`effect-storm "${label}" reached ${threshold} runs — likely reactive loop`,
				);
			}
		}
	};
}
