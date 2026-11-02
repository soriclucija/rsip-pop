# rsip-pop

Source code for the [Research Skills in Psychology: A Handbook](https://soriclucija.github.io/rsip-pop/) website, a central hub for Research Skills in Psychology (RSiP) students supervised by me at Tilburg University.

Built with [Quarto](https://quarto.org) and hosted on GitHub Pages.

## Getting started

### Prerequisites

- [Quarto](https://quarto.org/docs/get-started/)
- Positron (optional), use your preferred IDE

### Installation

```bash
git clone https://github.com/soriclucija/rsip-pop.git
cd rsip-pop
```

### Usage

Preview the site locally:

```bash
quarto preview
```

Build the site:

```bash
quarto render
```

The output is written to `docs/`, which GitHub Pages serves from the `main` branch.

### Schedule

The interactive schedule on the home page is generated from `timeline/timeline.yml`. To update dates, meetings, or deadlines, edit only that file and re-render the site.

## Author

Lucija Sorić, Tilburg University
