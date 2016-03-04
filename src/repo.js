import prompt from "./utils/prompt";
import {parse} from "url";
import github from "./repos/github";
import gitlab from "./repos/gitlab";

export default async function(ctx, pkg) {
	let repourl;

	if (pkg.repository && pkg.repository.url) {
		repourl = pkg.repository && pkg.repository.url;
		console.warn("Using repository URL found in package.json: %s", repourl);
	} else {
		repourl = (await prompt([{
			type: "input",
			name: "url",
			message: "What is the git repository URL?"
		}])).url;
	}

	let {host} = parse(repourl);
	let type;

	switch (host) {
		case "github.com":
			type = "github";
			console.warn("Assuming host type '%s' based on repo URL.", type);
			break;

		case "gitlab.com":
			type = "gitlab";
			console.warn("Assuming host type '%s' based on repo URL.", type);
			break;

		default:
			type = (await prompt([{
				type: "list",
				name: "type",
				message: "Which of Git host are you using?",
				choices: [
					{ name: "Github", value: "github" },
					{ name: "Gitlab", value: "gitlab" },
					{ name: "Other", value: "other" }
				]
			}])).type;
			break;
	}

	ctx.repository = {
		url: repourl,
		type
	};

	switch (type) {
		case "github":
			await github(ctx, pkg);
			break;

		case "gitlab":
			await gitlab(ctx, pkg);
			break;
	}
}
