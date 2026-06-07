import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest-beta.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest-beta.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest-beta.json", JSON.stringify(manifest, null, "\t"));

// compare two semver strings (prereleases sort before their release)
function compareSemver(a, b) {
	const parse = (s) => {
		const [core, pre] = s.split("-");
		return { n: core.split(".").map(Number), pre };
	};
	const A = parse(a),
		B = parse(b);
	for (let i = 0; i < 3; i++) {
		if ((A.n[i] || 0) !== (B.n[i] || 0)) return (A.n[i] || 0) - (B.n[i] || 0);
	}
	if (!A.pre && !B.pre) return 0;
	if (!A.pre) return 1;
	if (!B.pre) return -1;
	const pa = A.pre.split("."),
		pb = B.pre.split(".");
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const x = pa[i],
			y = pb[i];
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		const nx = Number(x),
			ny = Number(y);
		if (!isNaN(nx) && !isNaN(ny)) {
			if (nx !== ny) return nx - ny;
		} else if (x !== y) return x < y ? -1 : 1;
	}
	return 0;
}

// update versions.json with target version and minAppVersion from manifest-beta.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
const sorted = {};
for (const k of Object.keys(versions).sort(compareSemver)) sorted[k] = versions[k];
writeFileSync("versions.json", JSON.stringify(sorted, null, "\t"));
