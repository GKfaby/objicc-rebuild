import{useEffect} from 'react';
import{useLocation} from 'react-router-dom';

// React Router doesn't reset scroll position on navigation like a normal
// multi-page site does -- without this, going to a new page keeps
// whatever scroll depth you were at on the previous one.
//
// Only watches pathname (not search params) so it doesn't fight with
// pages that intentionally scroll to something after navigating -- e.g.
// EventsPage scrolling to a highlighted event via a ?id= query param.
export default function ScrollToTop(){
  const{pathname}=useLocation();
  useEffect(()=>{window.scrollTo(0,0);},[pathname]);
  return null;
}
