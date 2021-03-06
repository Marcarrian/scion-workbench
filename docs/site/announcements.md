<a href="/README.md"><img src="/resources/branding/scion-workbench-banner.svg" height="50" alt="SCION Workbench"></a>

| SCION Workbench | [Projects Overview][menu-projects-overview] | [Changelog][menu-changelog] | [Contributing][menu-contributing] | [Sponsoring][menu-sponsoring] |  
| --- | --- | --- | --- | --- |

## [SCION Workbench][menu-home] > Announcements

On this page you will find the latest news about the development of the SCION Workbench.

- **2020-06: Integration of the SCION Microfrontend Platform**\
We are working on the integration of the new [SCION Microfrontend Platform][link-scion-microfrontend-platform] into the workbench to enable a seamless integration of microfrontends as workbench views. Embedded microfrontends will be able to interact with the workbench via a framework-agnostic workbench API and benefit from the full functionality of the SCION Microfrontend Platform.

- **2020-06: Deprecation of the SCION Application Platform**\
While the SCION Application Platform did many things right, there was a strong push to rewrite the project so that it no longer depends on the SCION Workbench. A separation would provide non-workbench projects with proven concepts and solid tools to implement a microfrontend architecture on their own. That way, the [SCION Microfrontend Platform][link-scion-microfrontend-platform] was born, a lightweight, web stack agnostic library that has no user-facing components and does not dictate any form of application structure. It focuses on cross-origin communication, routing, and embedding of microfrontends.

- **2020-06: Deprecation of Activities in SCION Workbench**\
On the way to a true workbench layout, we deprecate activities to introduce the more powerful and flexible border panes. Border panes are placed at the edges of the view area, allowing the display of auxiliary content or context-sensitive assistance. We have not yet started with the implementation, so the naming and behaviour may change at any time.


[link-scion-microfrontend-platform]: https://github.com/SchweizerischeBundesbahnen/scion-microfrontend-platform/blob/master/README.md 

[menu-home]: /README.md
[menu-projects-overview]: /docs/site/projects-overview.md
[menu-changelog]: /docs/site/changelog/changelog.md
[menu-contributing]: /CONTRIBUTING.md
[menu-sponsoring]: /docs/site/sponsoring.md
