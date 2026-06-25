// Прокрутка страницы наверх. Скроллером является <body> (см. index.css:
// html{overflow:hidden} «отдаёт» прокрутку body, чтобы убрать overscroll-«плавание»),
// поэтому window.scrollTo больше не двигает страницу — скроллим document.body.
// Дёргаем оба варианта на случай иных режимов/браузеров.
export function scrollPageTop() {
  document.body.scrollTo(0, 0)
  window.scrollTo(0, 0)
}
