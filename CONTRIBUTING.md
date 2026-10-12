# Contributing

Contributions to Friskoli Chemotaxis are welcome. The project is maintained by SZU-SIAT-iGEM for educational play and outreach.

## Report a problem

Open a [GitHub issue](https://github.com/SZU-SIAT-iGEM/friskoli-chemotaxis/issues) with what happened, what you expected, and steps to reproduce. Include the release version, browser/OS, viewport or device, map size and seed, selected cell, and language. Screenshots or an exported run can help; remove personal information first.

For a security vulnerability, follow [SECURITY.md](SECURITY.md).

## Make a change

1. Fork the repository and create a branch for a focused change.
2. Install dependencies with `npm ci` and read [Development](docs/DEVELOPMENT.md).
3. Use the existing engine functions for rules and forecasts. Keep player strings in both language packs. Write documentation and comments in English.
4. Run `npm run verify`. For interface, interaction, or packaging changes, install Chromium and run `npm run test:browser` as well.
5. Update the relevant usage/rules/development documentation and submit a pull request describing the resulting behavior and validation.

Add focused regression checks when changing rules or fixing an interaction bug. Keep map and dice random streams separate. Avoid generated builds, local records, screenshots containing user data, and temporary files in commits.

For rule changes, explain the effect on movement, probability, scores, or record comparability. Maintainers decide when the rule identifier needs an update. Discuss larger features in an issue before expanding the implementation.

By submitting a contribution, you agree that your code and documentation can be distributed under the project's MIT License. Contribute only artwork you have permission to share, and specify its license. Friskoli branding has separate terms.

## Working together

Keep discussion respectful and specific. Describe observable behavior and evidence, credit other contributors, and avoid personal attacks. Maintainers may remove abusive content or close discussions that prevent productive collaboration.
