# Logo and intro animation

## Logo

The logo is the "Rubric initial" concept from the design: a red rounded square with a cream
lowercase "m" whose feet are diamonds. It is drawn as an inline SVG in
`frontend/src/components/ui/LogoMark.tsx`, so it needs no image file and stays sharp at any size.
Pass the size with a Tailwind class, for example `<LogoMark className="size-9" />`.

It replaces the dashed "LOGO" placeholder in three places: the sign-in and registration page (desktop
side panel and mobile header, both in `features/auth/components/AuthShell.tsx`) and the sidebar
(`components/layout/Sidebar.tsx`).

The logo is decorative for screen readers (`aria-hidden`), because the name "manulator" is always
written next to it.

## Intro animation

The left panel of the sign-in and registration page (desktop only, `AuthShell.tsx`) plays
`frontend/public/manulator-intro.mp4`.

- The video is 4:5 portrait (1080 x 1350 px, 26 s, no sound, about 3 MB). It sits between the logo and
  the headline, as wide as the whole panel, and is never cropped (`object-contain`). Its background
  has the colour of the panel (`#E6DFD1`, token `mt-sunken`), so the edges are not visible. If the
  panel colour changes, the video has to be re-exported with the new colour. The video must not
  contain a frame or text near its edges, because the panel is only about as tall as the video.
- It plays once, without sound, and stays on its last picture. It does not loop, because the last
  picture (the logo) and the first one look very different.
- `manulator-intro-poster.jpg` is the last picture of the video. It is shown while the video loads
  and instead of the video when the user has "reduce motion" turned on in the system.
- The video is decoration only (`aria-hidden`, not focusable). It carries no information that is not
  on the page as text.

To replace the video, overwrite the `.mp4` and make a new poster from its last frame:

    ffmpeg -sseof -0.3 -i manulator-intro.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 4 manulator-intro-poster.jpg

Keep the file small (a few MB): it is downloaded by everyone who opens the sign-in page.
