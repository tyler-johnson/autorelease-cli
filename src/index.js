import minimist from "minimist";
import fs from "fs-promise";

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

(async function() {
	try {
		let ctx = {
			env: {}, // environment vars
			options: {}, // autorelease options
			install: [], // extra packages to install
			publish: "npm publish" // command to release
		};

		let pkg = JSON.parse(await fs.readFile("./package.json", "utf-8"));
		await registry(ctx, pkg);
		await repo(ctx, pkg);
		console.log(ctx);
	} catch(e) {
		console.error(e.stack || e);
		process.exit(1);
	}
})();
