const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');
import('react-icons/si').then(({ SiSui }) => {
  console.log(renderToStaticMarkup(createElement(SiSui)));
});
