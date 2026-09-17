<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Issues][issues-shield]][issues-url]
[![project_license][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/anthonyA1214/traffic-flow-simulator">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a> <h3 align="center">Traffic Flow Simulator</h3>

  <p align="center">
    A cellular-automaton traffic simulator (Nagel-Schreckenberg model) driven by real intersection geometry, built for signal-timing optimization experiments.
    <br />
    <a href="https://github.com/anthonyA1214/traffic-flow-simulator"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <!-- <a href="https://github.com/github_username/repo_name">View Demo</a> -->
    &middot;
    <a href="https://github.com/anthonyA1214/traffic-flow-simulator/issues/new?template=bug_report.yml">Report Bug</a>
    &middot;
    <a href="https://github.com/anthonyA1214/traffic-flow-simulator/issues/new?template=feature_request.yml">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <!-- <li><a href="#roadmap">Roadmap</a></li> -->
    <li><a href="#license">License</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

<!-- [![Product Name Screen Shot][product-screenshot]](https://example.com) -->

This project simulates traffic flow through a real intersection using the **Nagel-Schreckenberg (NaSch) cellular automaton model**, with the goal of experimenting with signal timing optimization.

The focus intersection is the **Roxas Boulevard / Padre Burgos Avenue / Bonifacio Drive** junction in Manila (near Luneta/Rizal Park) — a multi-leg convergence rather than a simple 4-way. Road geometry is pulled once from OpenStreetMap and used purely as a static spatial reference; no external APIs or live traffic data are used at runtime. The simulation logic itself operates on abstract 1D lane arrays and has no inherent dependency on real-world geometry.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![Python][python-shield]][python-url]
* [![FastAPI][fastapi-shield]][fastapi-url]
* [![React][react-shield]][react-url]
* [![Leaflet][leaflet-shield]][leaflet-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* [uv][uv-url]
```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```
* [Bun][bun-url]
```sh
curl -fsSL https://bun.sh/install | bash
```

### Installation

1. Clone the repo
```sh
   git clone https://github.com/anthonyA1214/traffic-flow-simulator.git
   cd traffic-flow-simulator
```
2. Install root dependencies (bun), frontend dependencies (bun), and Python deps (uv):
```sh
   bun install
   cd frontend && bun install && cd ..
   cd backend && uv sync && cd ..
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

Run both backend and frontend together:
```sh
bun run dev
```

Or run them separately:
```sh
bun run dev:backend   # uv run fastapi dev src/main.py
bun run dev:frontend  # bun run dev (Vite/React)
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
<!-- ## Roadmap -->
<!---->
<!-- - [ ] Feature 1 -->
<!-- - [ ] Feature 2 -->
<!-- - [ ] Feature 3 -->
<!--     - [ ] Nested Feature -->
<!---->
<!-- See the [open issues](https://github.com/github_username/repo_name/issues) for a full list of proposed features (and known issues). -->
<!---->
<!-- <p align="right">(<a href="#readme-top">back to top</a>)</p> -->



<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE][license-url] for more information.

&copy; IntegraTech 2026

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[python-shield]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=fff
[python-url]: https://www.python.org/
[fastapi-shield]: https://img.shields.io/badge/FastAPI-009485.svg?style=for-the-badge&logo=fastapi&logoColor=white
[fastapi-url]: https://fastapi.tiangolo.com/
[react-shield]: https://img.shields.io/badge/React-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB
[react-url]: https://react.dev/
[leaflet-shield]: https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white
[leaflet-url]: https://leafletjs.com/
[uv-url]: https://docs.astral.sh/uv/
[bun-url]: https://bun.com/
[product-screenshot]: images/screenshot.png
[issues-shield]: https://img.shields.io/github/issues/anthonyA1214/traffic-flow-simulator?style=for-the-badge
[issues-url]: https://github.com/anthonyA1214/traffic-flow-simulator/issues
[license-shield]: https://img.shields.io/github/license/anthonyA1214/traffic-flow-simulator?style=for-the-badge
[license-url]: LICENSE
