import {readJSON,writeJSON} from "./utils/json";
import {cloneDeep,merge,omit,forEach,isEqual,size,uniq,reduce} from "lodash";
import prompt from "./utils/prompt";
import {spawn} from "child_process";

function mergeSteps(cur, next) {
	if (!cur || typeof cur !== "object" || Array.isArray(cur)) {
		return next || cur;
	}

	if (next) forEach(next, (v, k) => {
		cur[k] = uniq([].concat(cur[k], v).filter(Boolean));
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

export default async function({options,publish,install,publishConfig}) {
	let opkg = await readJSON("package.json");
	let pkg = cloneDeep(opkg);

	// no need for a version anymore
	delete pkg.version;

	// merge publish config
	if (size(publishConfig)) {
		pkg.publishConfig = merge(pkg.publishConfig, publishConfig);
	}

	// write autorelease script, careful when overwriting existing content
	if (!pkg.scripts) pkg.scripts = {};
	let arscript = `autorelease pre && ${publish || "npm publish"} && autorelease post`;
	let writeScript = !pkg.scripts.autorelease;
	if (publish && !writeScript && arscript !== pkg.scripts.autorelease) {
		console.warn("package.json has an autorelease script which conflicts with this one.");
		writeScript = await resolveConflict(pkg.scripts.autorelease, arscript, "Overwrite the existing autorelease script?");
	}
	if (writeScript) pkg.scripts.autorelease = arscript;

	// save the package.json
	if (!isEqual(opkg, pkg)) await writeJSON("package.json", pkg);

	// save options to autoreleaserc
	let rc = await readJSON(".autoreleaserc", true) || {};
	let config = merge({}, rc, omit(options, "pre", "post"));
	config.pre = mergeSteps(config.pre, options.pre);
	config.post = mergeSteps(config.post, options.post);
	config = reduce(config, (m, v, k) => {
		if (typeof v !== "undefined") m[k] = v;
		return m;
	}, {});
	if (size(config) || !isEqual(rc, config)) await writeJSON(".autoreleaserc", config);

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
