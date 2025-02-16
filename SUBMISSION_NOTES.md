# Submission Notes

## Table of Contents
- [Summary](#summary)
- [Overview](#overview)
- [Explanation Points](#explanation-points)
  - [1. Docker](#1-docker)
  - [2. The new REST API](#2-the-new-rest-api)
- [Future Improvements](#future-improvements)
  - [1. Package Organization](#1-package-organization)
  - [2. Forking the Kamino Plugin](#2-forking-the-kamino-plugin)
  - [3. Implementing missed Cache Fallback Strategy](#3-implementing-missed-cache-fallback-strategy)
- [Issues](#issues)
  - [1. Price Data](#1-price-data)

---

### Summary
I forked the original repository just so that I can have the chance to sync
the latest changes if I wanted, extended it to achieve the assignment goals,
and included notes on what I did later on in this document. 

### Overview
The `NEW_README.md` contains the actual instructions on:
- how to set up this (forked) repository,
- how to run the cache server and the API locally,
- and how to run both on docker containers.

I excluded the introductory parts that are already in `README.md` to avoid
redundancy and focus on the assignment requirements only. While keeping the 
main `README.md` as is to avoid merge-conflicts when pulling from the original
repository.

There are much more things that I believe could improve this repository as a 
whole from the perspective of a future product for Vybe. However, I refrained 
from altering the repository too much due to lack of context of the future 
use-case goals.

---

### Explanation Points

#### 1. Docker
- I wrote why I chose the base image I chose in the beginning of `Dockerfile`.
- I traded more build-time with having a slightly smaller image size and faster
container start-up time. I build and bundle the code first which requires the
dev dependencies. Then I remove the modules, and re-install only the production
modules for smaller image size. 
- If the organization of the packages were done better, the image size could've
been much smaller (You can refer to [this section](#1-package-organization)) for
more detail and reasoning.
- For docker containers, I'm using `.env.production` for better separation of 
concerns in managing environment variables.
- I set the restart policy to `always`, so that if the containers fail for any
reason, or the system was restarted, the docker containers would automatically
restart. (Though this requires your system to have the `docker` service enabled).

#### 2. The new REST API
- I created a new REST API package at `packages/api` to allow for running Jobs 
and Fetchers dynamically.
- The reason for dynamic endpoints is to act as an alternative interface to the
CLI commands, which run too slow by the way.
- With the correct package organization, the bundling process of the API could
have been more efficient.

---

### Future Improvements
Here's some general things I think should be done on this repository before
moving on to molding it into a production-ready component of Vybe:

#### 1. Package Organization
I'm not fan of the organization. It could've been much better by following the
Single Responsibility principle. In other words, the Plugins' package doesn't
have to be responsible for containing the Cache Server within the Plugins 
package itself. This adds unnecessary dependency and hinders opportunities for 
future extensions.

I think the goal should be to organize the package like this:
- **core** - Contains utilities and shareable code.
- **cache-server** - A fairly simple storage server.
- **plugins** - All the different plugins. Can use the utilities from `core`
- **api** - The REST API that interfaces the **Fetchers** and **Jobs** 
dynamically.

And it should be easy to **selectively** compile a project independently such
that only its dependencies (references) get compiled as JavaScript with it. l
For example, if you wanted to _only_ run the `cache-server`, you really don't
need `core` or `plugins` to run an [Unstorage](https://unstorage.unjs.io/)
storage server.

Same with `plugins`, you shouldn't have to compile `cache-server` just to run
a fetcher or a job with CLI.

The `api` in this case would reference the `core` for the utilities and 
`plugins` for the plugins' fetchers and jobs' functions.

This architecture would allow  for much more efficiency and faster container 
start-up times.

#### 2. Forking the Kamino Plugin
I believe in order to have a more refined code for Vybe's use-cases, and
potential performance optimization opportunities, one should dig deeper into
what Kamino plugins does and how exactly it's doing it. And create a fork or 
simply override the code to improve, optimize for speed, and make it easier to 
debug.

#### 3. Implementing missed Cache Fallback Strategy
The current code requires one to first run all the required Jobs to pull data 
from an RPC API and store it in the cache. However, there could be an option
to get a cache item with a fallback strategy of fetching the required job to 
fetch the required data and cache it for the future. The current implementation
makes it not so straightforward to change to the implementation I'm suggesting,
but it's worth putting extra time on. 

---
### Issues

#### 1. Price Data
- I ran into a weird behavior where the Kamino pools job doesn't seem to fetch
  some Token Prices needed for the Wallet ID in the assignment. I suspect it's due
  to Helius API rate-limiting me in the middle of the process (it shows 429 errors
  in the console when I enable the RPC logs), hence missing that wallet, but I'm
  not too sure. How I found out about this was through debugging `kamino-depoists`
  fetcher and the `kamino-pools` job with console logs and step-by-step debugger
  in my IDE. The fetcher does fetch every Borrow/Lending data correctly, but at
  the final step of the `kamino-deposits` fetcher, it doesn't find the Token Price
  from the Pools cache, and returns empty at the end. This issue doesn't happen
  with the other cache server mentioned in `.env.example`. But, I manually removed
  it to test locally, and then I noticed this weird issue.
