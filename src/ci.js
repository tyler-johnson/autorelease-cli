import prompt from "./utils/prompt";
import {forEach} from "lodash";
import travis from "./cis/travis";

export default async function(ctx, pkg) {
	let def = null;
	let choices = [
		{ name: "Other/None (print env vars)", value: "other" }
	];

	switch (ctx.repository.type) {
		case "github":
			choices.unshift({ name: "Travis CI Pro", value: "travis-pro" });
			choices.unshift({ name: "Travis CI", value: "travis" });
			def = "travis";
			break;

		case "gitlab":
			choices.unshift({ name: "Gitlab CI", value: "gitlab" });
			def = "gitlab";
			break;
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
			await travis(ctx, pkg, type === "travis-pro");
			break;

		case "gitlab":

			break;

		case "other":
			forEach(ctx.env, (val, key) => {
				console.log("%s=%s", key, val);
			});
			break;
	}
}
