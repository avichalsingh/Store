export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("rhythm-theme");if(t!=="light"&&t!=="dark")t="dark";var e=document.documentElement;e.classList.toggle("light",t==="light");e.classList.toggle("dark",t==="dark");e.style.colorScheme=t;}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
