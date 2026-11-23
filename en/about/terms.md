# Terms of Service

_Last updated: November 19, 2026_

These Terms of Service ("Terms") describe the conditions for using UMC (Universal Minecraft Core), including the UMC Core library, command-line tools, daemon, SDK, loader adapters, documentation, and official builds (together, "UMC"). By downloading, installing, or using UMC, you agree to these Terms. If you do not agree, do not use UMC.

This page states the project's own policy. It is not legal advice and does not replace the Microsoft Services Agreement, the Minecraft EULA, or any other third-party terms.

## What UMC is

UMC is an independent, open-source community project. It is not made, approved, endorsed, or supported by Mojang Studios or Microsoft, and it is not an official Minecraft product. The name "Minecraft" identifies the game UMC is designed to work with; it does not indicate ownership, partnership, or endorsement.

Use a clear notice in project listings, release descriptions, and application About/Legal pages:

> UMC is an independent project. It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.

Mojang and Microsoft retain their rights in the Minecraft name, marks, logos, game, launcher, and related materials. Do not use their logos or presentation in a way that suggests official status. Review the current [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) and [Minecraft EULA](https://www.minecraft.net/en-us/eula) before distributing or promoting a Minecraft-related product.

## License

UMC-authored source code and documentation are licensed under the MIT License in this repository. The MIT License covers only material that UMC is entitled to license. It does not grant rights to Minecraft game files, Minecraft/Mojang/Microsoft marks, third-party mods, mod loaders, modpacks, or online services.

## Ownership boundaries

| Material | Project boundary |
|---|---|
| UMC-authored source code and documentation | Copyright is held by the listed UMC authors and contributors and licensed under the MIT License in this repository. |
| UMC name and project artwork | Used to identify this independent project. Permission to use UMC branding is not permission to use Minecraft or Mojang/Microsoft branding. |
| Minecraft game files, Minecraft/Mojang/Microsoft marks, and their online services | Not owned or licensed by UMC. UMC does not bundle the game in its releases; the engine obtains game files from metadata and download sources as part of a user-requested installation. |
| Microsoft, Xbox, and Minecraft account credentials and profile information | Not UMC property. UMC signs in through Microsoft's OAuth pages and never receives your Microsoft password. Account data is handled as described in the [Privacy Policy](privacy.md). |
| Fabric, Forge, NeoForge, mod platforms, mods, and modpacks | Independently maintained or created. Their names, code, content, trademarks, terms, and licenses remain with their respective owners. UMC's adapters do not grant rights to those projects or content. |
| Rust dependencies | Third-party software governed by the licenses declared by their authors. Release packaging should include applicable notices; the UMC MIT license does not replace dependency licenses. |

"Powered by UMC Core" is an optional integration credit, not an endorsement and not an MIT requirement. See the [developer guide](../development/index.md) for redistribution notes.

## Your responsibilities

- **Use your own account.** Sign in with a Microsoft account that you are entitled to use, and follow the Microsoft Services Agreement, the Minecraft EULA, and the Minecraft Usage Guidelines.
- **Do not bypass access controls.** Do not use UMC to avoid authentication, ownership checks, parental controls, regional restrictions, paid entitlements, or copy protection.
- **Do not redistribute what you do not own.** Game files, assets, mods, modpacks, and third-party binaries remain subject to their own licenses. Installing content does not give you the right to share it.
- **Keep local data private.** Anyone who can read the UMC data directory or connect to its local IPC endpoint can control the installation. Protect that directory and run UMC under your own user account.
- **Do not abuse services.** Do not use UMC to attack, overload, scrape, or circumvent rate limits on Mojang, Microsoft, mod platform, or community services.
- **Review what you install.** Mods, modpacks, and loader installers are third-party software. You are responsible for the content you choose to run.

## Accounts and third-party services

UMC can sign in with a Microsoft account using the OAuth 2.0 authorization code flow with PKCE. Sign-in happens on Microsoft's own pages; UMC never receives or stores your Microsoft password. After sign-in, UMC exchanges tokens with Xbox Live, XSTS, and Minecraft services to obtain a Minecraft session and profile.

Your use of Microsoft, Xbox, and Minecraft services is governed by their own terms and privacy policies. UMC cannot create, restore, suspend, or appeal an account, and cannot grant game ownership. Eligibility, ownership checks, parental controls, and regional restrictions are enforced by Microsoft and Mojang, not by UMC.

UMC is not affiliated with mod loaders, mod platforms, or servers you connect to. Their operators set their own rules and terms.

## No warranty

UMC is provided under the MIT License, including its "AS IS" warranty disclaimer and limitation of liability. The project does not warrant that UMC will be uninterrupted, error-free, secure, or compatible with any particular game version, mod, loader, or operating system.

## Support boundary

Mojang, Microsoft, and third-party mod or loader maintainers do not provide support for UMC merely because it interacts with their software or services. Report UMC-specific issues through the project's GitHub issue tracker. Game, account, loader, and mod issues may need to be directed to their respective maintainers.

## Changes to these Terms

These Terms may be updated as UMC adds or changes features. The current version is always the one published in this documentation and in the repository history; the date at the top shows when it last changed. If a change is material, it will be called out in the release notes. Continued use of UMC after an update means the updated Terms apply.

## Contact

Questions about these Terms can be raised in the project's [GitHub issue tracker](https://github.com/UMC-Community/UMC/issues).
