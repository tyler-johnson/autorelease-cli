import {readFile,writeFile} from "fs-promise";

export async function readJSON(p, allowMissing) {
	try {
		return JSON.parse(await readFile(p, "utf-8"));
	} catch (e) {
		if (!allowMissing || e.code !== "ENOENT") throw e;
	}
}

export async function writeJSON(p, v, t=2) {
	await writeFile(p, JSON.stringify(v, null, t));
}
