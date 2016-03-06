import minimist from "minimist";
import promisify from "es6-promisify";
import npm from "global-npm";
import {readJSON} from "./utils/json";

let argv = minimist(process.argv.slice(2), {
	string: [ ],
	boolean: [ "help", "version" ],
	alias: {
		h: "help", H: "help",
		v: "version", V: "version"
	}
});

if (argv.help) {
	console.log("halp plz");
	process.exit(0);
}

if (argv.version) {
	let pkg = require("./package.json");
	console.log("%s %s", pkg.name, pkg.version || "edge");
	process.exit(0);
}

import registry from "./registry";
import repo from "./repo";
import ci from "./ci";
import final from "./final";

(async function() {
	try {
		await promisify(npm.load.bind(npm))({});

		let ctx = {
			env: {}, // environment vars
			options: {}, // autorelease options
			install: [], // extra packages to install
			publish: null, // command to release
			package: await readJSON("./package.json") // the local packagejson
		};

		await registry(ctx);
		await repo(ctx);
		await ci(ctx);
		await final(ctx);
	} catch(e) {
		console.error(e.stack || e);
		process.exit(1);
	}
})();
