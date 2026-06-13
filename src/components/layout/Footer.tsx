import{Link} from 'react-router-dom';
import{MapPin,Phone,Mail} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
export default function Footer(){
  const{systemSettings}=useUser();
  const year=new Date().getFullYear();
  return(
    <footer className="bg-navy text-white/70">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4">
            {systemSettings.logoUrl&&(
              <div className="logo-footer-wrap">
                <img src={systemSettings.logoUrl} alt={systemSettings.orgName}
                  onError={e=>{const img=e.target as HTMLImageElement;if(img.src!==window.location.origin+'/logo.png')img.src='/logo.png';else img.closest('.logo-footer-wrap')?.classList.add('hidden');}}/>
              </div>
            )}
            <h3 className="text-white font-black text-xl uppercase tracking-tighter">{systemSettings.orgName}</h3>
            <p className="text-sm leading-relaxed">{systemSettings.heroText}</p>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              {[{label:'Home',href:'/'},{label:'Events',href:'/events'},{label:'Contact Us',href:'/contact'},{label:'Sign Up',href:'/signup'}].map(l=>(
                <Link key={l.href} to={l.href} className="text-sm hover:text-gold transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Contact</h4>
            <div className="flex flex-col gap-3 text-sm">
              {systemSettings.address&&<div className="flex gap-2 items-start"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gold"/><span>{systemSettings.address}</span></div>}
              {systemSettings.whatsappNumber&&<a href={`https://wa.me/${systemSettings.whatsappNumber}`} target="_blank" rel="noreferrer" className="flex gap-2 items-center hover:text-gold"><Phone className="w-4 h-4 shrink-0 text-gold"/><span>+{systemSettings.whatsappNumber}</span></a>}
              {systemSettings.email&&<a href={`mailto:${systemSettings.email}`} className="flex gap-2 items-center hover:text-gold"><Mail className="w-4 h-4 shrink-0 text-gold"/><span>{systemSettings.email}</span></a>}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-xs text-center text-white/40">© {year} {systemSettings.orgName}. All rights reserved.</div>
      </div>
    </footer>
  );
}