import prompt from "./utils/prompt";
import {forEach,size} from "lodash";
import travis from "./cis/travis";
import gitlab from "./cis/gitlab";

export default async function(ctx) {
	let def = null;
	let {type:rtype} = ctx.repository;
	let choices = [
		{ name: "Other/None", value: "other" }
	];

	if (rtype === "github") {
		choices.unshift({ name: "Travis CI Pro", value: "travis-pro" });
		choices.unshift({ name: "Travis CI", value: "travis" });
		def = "travis";
	} else if (rtype === "gitlab") {
		choices.unshift({ name: "Gitlab CI", value: "gitlab" });
		def = "gitlab";
	}

	let type;
	if (choices.length === 1) type = choices[0].value;
	else type = (await prompt([{
		type: "list",
		name: "type",
		message: "Which continous integration service are you using?",
		choices: choices,
		default: def
	}])).type;

	switch (type) {
		case "travis":
		case "travis-pro":
			await travis(ctx, type === "travis-pro");
			break;

		case "gitlab":
			await gitlab(ctx);
			break;

		case "other":
			if (size(ctx.env)) {
				console.warn("These are some environment variables that need to be set for autorelease to work:\n");
				forEach(ctx.env, (val, key) => {
					console.log("  %s=%s", key, val);
				});
				console.warn();
			} else {
				console.warn("No environment variables to print.");
			}
			break;
	}
}
