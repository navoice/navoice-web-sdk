import Link from 'next/link';
import DemoPageLayout from "@/components/DemoPageLayout";

export default function EventsPage() {
  return (
    <DemoPageLayout title="Events" activeNav="events">

      <main className="space-y-8">
        <section className="relative h-[400px] rounded-3xl overflow-hidden shadow-xl group">
          <img
            alt="Summer Jazz Concert"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          src="https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2"          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 space-y-3">
            <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase tracking-wider rounded-md">Featured Event</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Summer Jazz in the <br />Central Park
            </h2>
            <div className="flex items-center gap-2 text-white/90">
              <span className="material-icons-outlined text-sm">location_on</span>
              <span className="text-sm font-medium">Central Pavilion • Today 6:00 PM</span>
            </div>
          </div>
        </section>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          <button className="flex-shrink-0 px-6 py-3 bg-primary text-white rounded-full font-medium shadow-lg shadow-primary/20 transition-transform active:scale-95">
            All Events
          </button>
          <button className="flex-shrink-0 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-icons-outlined text-green-500">festival</span>
            Festivals
          </button>
          <button className="flex-shrink-0 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-icons-outlined text-blue-500">sports_soccer</span>
            Sports
          </button>
          <button className="flex-shrink-0 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-icons-outlined text-purple-500">palette</span>
            Art
          </button>
        </div>
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold dark:text-white">This Weekend</h3>
            <a className="text-primary font-semibold hover:underline" href="#">See all</a>
          </div>
          <div className="grid gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-5 hover:shadow-md transition-shadow">
              <div className="w-full md:w-48 h-32 flex-shrink-0">
                <img
                  alt="Street Fair"
                  className="w-full h-full object-cover rounded-2xl"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsTZJyDwt86kYuCorj-vXnJyknW2ugbAuL3Hf6ZLr_O5eFaPrfCcXuoUFg2x96oJkUJgHxzd5fUT8jrxFH7wEyBeEYD37VxAGt_vqPhatpJn-Ua-12MmTcdPHa-fnrrmxSOChGoW0hd8JvWcYl7PJK2YBCtltD5HlZTloqYyif_qXz2z1KEI-9qPLiywwplgyCGG1HUyEEolbk-hteM3wl68jGcIm3oHL7yTLtQflZn3vQvCPWqaiIyk9D7RkkWk4H1347nYVRHvc"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wide">Saturday • 10:00 AM</span>
                  <h4 className="text-lg font-bold mt-1 dark:text-white">Downtown Street Fair</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Main Street District</p>
                </div>
                <button className="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-50 dark:bg-slate-700/50 text-primary font-medium rounded-xl hover:bg-primary hover:text-white transition-all">
                  <span className="material-icons-outlined text-sm">calendar_today</span>
                  Add to Calendar
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-5 hover:shadow-md transition-shadow">
              <div className="w-full md:w-48 h-32 flex-shrink-0">
                <img
                  alt="Charity Run"
                  className="w-full h-full object-cover rounded-2xl"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB27n06cxDOVMvT8qxqh3exrzjenSX2GrEn6nUiLkkfvNPRQdEvUSNweOQU43pnDADB9RmQknq9WNWByIsMuMzoUhtIyzNI5QQYAYpmk4ThQghDrbpcgIssB8otmM3Nr_G8xRlGzif6GxXMkSXYZ0orJnjA2NTav4bhCYwI36bNQAefdRKTIoN3oVviWGUHZxe0PWtvARObH00TRJmY8Nk7hdbwJihBC2wa2Q--M_SEDERUxBGe4O0IR1XipSjlCmIuxYHdoUwuhEk"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wide">Sunday • 07:30 AM</span>
                  <h4 className="text-lg font-bold mt-1 dark:text-white">MyCity 5K Charity Run</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Riverside Park Entrance</p>
                </div>
                <button className="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-50 dark:bg-slate-700/50 text-primary font-medium rounded-xl hover:bg-primary hover:text-white transition-all">
                  <span className="material-icons-outlined text-sm">calendar_today</span>
                  Add to Calendar
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-5 hover:shadow-md transition-shadow">
              <div className="w-full md:w-48 h-32 flex-shrink-0">
                <img
                  alt="Pottery Class"
                  className="w-full h-full object-cover rounded-2xl"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4__AyPAl11NGYsusgXccxhPs1VfQq2P2R8AL7pxJf4KHWj2PEWxQ9SwERVaKfv6NajIgR6fbyxCbmOS81IJ8SDtHJTupfdVqnxBIOySK4QWSitca954t9f8lU1j1ibkKKUJ4KgKqsF7MHJkKUCWMdZMvpdtrNvgyzqWgsZ1EF1mrXhQIt7L_OTi4mnXf7eyB7dCEPCUzZPiD8FWJqxWWqrbOp9GgjazgaQXXB7S74D1d80HfcUZ-mUvxFcEQm-j5oYITeawTcZjo"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-green-500 uppercase tracking-wide">Sunday • 02:00 PM</span>
                  <h4 className="text-lg font-bold mt-1 dark:text-white">Community Pottery Class</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Arts Center, Room 4</p>
                </div>
                <button className="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-50 dark:bg-slate-700/50 text-primary font-medium rounded-xl hover:bg-primary hover:text-white transition-all">
                  <span className="material-icons-outlined text-sm">calendar_today</span>
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
   </DemoPageLayout>
  );
}
