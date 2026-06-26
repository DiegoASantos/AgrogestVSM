import { execFileSync } from "node:child_process";
import process from "node:process";

const branch = process.env.BRANCH_PROTECTION_BRANCH ?? "master";
const requiredCheck = process.env.BRANCH_REQUIRED_CHECK ?? "Quality gate";

try {
  execFileSync("gh", ["--version"], { stdio: "ignore" });
} catch {
  console.error(
    "GitHub CLI (`gh`) is required to verify branch protection. " +
      "Install it and authenticate with `gh auth login`."
  );
  process.exit(2);
}

let protection;

try {
  const output = execFileSync(
    "gh",
    [
      "api",
      `repos/{owner}/{repo}/branches/${branch}/protection`,
      "--jq",
      "{required_status_checks: .required_status_checks, required_pull_request_reviews: .required_pull_request_reviews, enforce_admins: .enforce_admins}"
    ],
    { encoding: "utf8" }
  );
  protection = JSON.parse(output);
} catch (error) {
  console.error(
    `Branch protection for '${branch}' could not be verified. ` +
      "Configure it in GitHub or run this command from an authenticated repo clone."
  );
  process.exit(1);
}

const contexts = protection.required_status_checks?.contexts ?? [];
const checks = protection.required_status_checks?.checks ?? [];
const checkNames = [
  ...contexts,
  ...checks.map((check) => check.context).filter(Boolean)
];
const hasRequiredCheck = checkNames.includes(requiredCheck);
const requiresPullRequest = Boolean(protection.required_pull_request_reviews);

if (!hasRequiredCheck || !requiresPullRequest) {
  console.error(`Branch protection for '${branch}' is incomplete.`);
  console.error(`- Required check '${requiredCheck}': ${hasRequiredCheck}`);
  console.error(`- Pull request reviews required: ${requiresPullRequest}`);
  process.exit(1);
}

console.log(
  `Branch protection verified for '${branch}' with required check '${requiredCheck}'.`
);
