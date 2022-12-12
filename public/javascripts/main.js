let main_picture = document.querySelector(".main-picture img");
let picture_Menu = document.querySelectorAll(".others-picture img");

picture_Menu.forEach(function (picture) {
  picture.addEventListener("click", function () {
    main_picture.src = picture.src;
  });
});
