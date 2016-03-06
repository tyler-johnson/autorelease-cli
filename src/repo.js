import prompt from "./utils/prompt";
import github from "./repos/github";
import gitlab from "./repos/gitlab";
import parseGitUrl from "git-url-parse";

export default async function(ctx) {
	let {package:pkg} = ctx;
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

	let giturl = parseGitUrl(repourl);
	let type;

	switch (giturl.resource) {
		case "github.com":
			type = (await prompt([{
				type: "confirm",
				name: "type",
				message: "Do you want to use Travis CI and/or publish changelogs to GitHub?",
				default: true
			}])).type ? "github" : "other";
			// console.warn("Assuming host type '%s' based on repo URL.", type);
			break;

		case "gitlab.com":
			type = (await prompt([{
				type: "confirm",
				name: "type",
				message: "Do you want to use GitLab CI and/or publish changelogs to GitLab?",
				default: true
			}])).type ? "gitlab" : "other";
			// console.warn("Assuming host type '%s' based on repo URL.", type);
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
		...giturl,
		type
	};

	switch (type) {
		case "github":
			await github(ctx);
			break;

		case "gitlab":
			await gitlab(ctx);
			break;
	}
}
