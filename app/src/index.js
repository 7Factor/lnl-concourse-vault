import mustache from "mustache/mustache.mjs";

const $container = document.getElementById('statuses');

const statusTemplate = `
 {{#lines}}
    <div class="line">
        <div class="bar {{ id }}"></div>
        <div class="name">{{ name }}</div>
        <div class="status">{{ lineStatuses.0.statusSeverityDescription }}</div>
    </div>
 {{/lines}}
`;

const errorTemplate = `Could not retrieve status information`;

async function getStatuses() {
  await fetch('/status')
    .then(response => {
      if (!response.ok) {
        throw Error();
      }
      return response;
    })
    .then(response => response.json())
    .then(render)
    .catch(error);
}

function render(lines) {
  $container.innerHTML = mustache.render(statusTemplate, {lines});
}

function error() {
  $container.innerHTML = mustache.render(errorTemplate);
}

getStatuses();
