import {readJSON,writeJSON} from "./utils/json";
import {merge,omit,forEach,isEqual,size} from "lodash";
import prompt from "./utils/prompt";
import {spawn} from "child_process";

function mergeSteps(cur, next) {
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
		return next || cur;
	}

	if (next) forEach(next, (v, k) => {
		cur[k] = [].concat(cur[k], v).filter(Boolean);
	});

	return cur;
}

async function resolveConflict(actual, desired, message) {
	let {result} = await prompt([{
		type: "expand",
		name: "result",
		message,
		choices: [{
			key: "y",
			name: "Overwrite",
			value: true
		},{
			key: "n",
			name: "Keep Existing",
			value: false
		},{
			key: "d",
			name: "Show Diff",
			value: "diff"
		}]
	}]);

	if (result === "diff") {
		console.warn("Current: %s", JSON.stringify(actual));
		console.warn("Desired: %s", JSON.stringify(desired));
		return await resolveConflict(actual, desired, message);
	}

	return result;
}

export default async function({options,publish,install}) {
	// write new autorelease script, careful not to overwrite existing content
	let pkg = await readJSON("package.json");
	if (!pkg.scripts) pkg.scripts = {};

	let arscript = `autorelease pre && ${publish || "npm publish"} && autorelease post`;
	let write = !pkg.scripts.autorelease;
	if (publish && !write && arscript !== pkg.scripts.autorelease) {
		console.warn("package.json has an autorelease script which conflicts with this one.");
		write = await resolveConflict(pkg.scripts.autorelease, arscript, "Overwrite the existing autorelease script?");
	}
	if (write) {
		pkg.scripts.autorelease = arscript;
		await writeJSON("package.json", pkg);
	}

	// save options to autoreleaserc
	let rc = await readJSON(".autoreleaserc", true) || {};
	let config = merge({}, rc, omit(options, "pre", "post"));
	config.pre = mergeSteps(config.pre, options.pre);
	config.post = mergeSteps(config.post, options.post);
	if (size(config) && !isEqual(rc, config)) await writeJSON(".autoreleaserc", config);

	// install npm modules
	await new Promise((resolve, reject) => {
		let proc = spawn("npm", [
			"install",
			"--save-dev",
			"--depth", "0",
			"autorelease",
			...install
		], {
			stdio: "inherit"
		});

		proc.on("error", reject);
		proc.on("exit", (c) => {
			if (!c) resolve();
			else reject(new Error(`npm install exited with status code ${c}`));
		});
	});

	console.warn(`Congratulations! This repo is ready to go with autorelease.`);
}
