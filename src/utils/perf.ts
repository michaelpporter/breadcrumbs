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

export function effect_counter(label: string, threshold = 50) {
	let count = 0;
	let warned = false;
	let window_start = 0;
	return () => {
		const now = performance.now();
		if (now - window_start > 250) {
			window_start = now;
			count = 0;
			warned = false;
		}
		count++;
		if (!warned && count > threshold) {
			warned = true;
			log.error(
				`effect-storm: "${label}" ran ${count}x in <250ms — likely reactive loop`,
			);
		}
	};
}
