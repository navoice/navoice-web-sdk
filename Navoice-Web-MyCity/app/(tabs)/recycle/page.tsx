import Link from 'next/link';
import DemoPageLayout from "@/components/DemoPageLayout";

export default function RecyclePage() {
  return (
    <DemoPageLayout title="Recycle" activeNav="recycle">
    

     <div className="space-y-8">

       <div className="space-y-8">
          <section className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="h-48 md:h-64 overflow-hidden">
              <img
                alt="Recycling bins in a clean neighborhood"
                className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1604187351574-c75ca79f5807"              />
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Upcoming Pickup
                </div>
                <h3 className="text-3xl font-bold">Friday, Oct 25</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-icons-outlined text-slate-400">delete</span>
                    Trash
                  </li>
                  <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-icons-outlined text-primary">recycling</span>
                    Recycling
                  </li>
                  <li className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span className="material-icons-outlined text-green-500">eco</span>
                    Green Waste
                  </li>
                </ul>
                <div className="flex items-end md:justify-end">
                  <button className="w-full md:w-auto px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                    Full Schedule
                  </button>
                </div>
              </div>
            </div>
          </section>
          <section className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <span className="material-icons-outlined">search</span>
            </div>
            <input
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder="How do I dispose of..."
              type="text"
            />
          </section>
          <section className="space-y-4">
            <h4 className="text-lg font-bold">Waste Categories</h4>
            <div className="grid grid-cols-3 gap-4">
              <button className="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 hover:border-primary transition group shadow-sm">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition">
                  <span className="material-icons-outlined">recycling</span>
                </div>
                <span className="font-semibold text-sm">Plastic</span>
              </button>
              <button className="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition group shadow-sm">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
                  <span className="material-icons-outlined">devices</span>
                </div>
                <span className="font-semibold text-sm">E-waste</span>
              </button>
              <button className="bg-white dark:bg-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 hover:border-red-500 transition group shadow-sm">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition">
                  <span className="material-icons-outlined">report_problem</span>
                </div>
                <span className="font-semibold text-sm">Hazardous</span>
              </button>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold">Nearest Drop-off Center</h4>
              <button className="text-primary font-semibold text-sm hover:underline">View Map</button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-48 bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                <img
                  alt="Map view of the city"
                  className="w-full h-full object-cover opacity-50 dark:opacity-30"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJ9v_FTITmFcPCoHA85jm52Iclj0hDvihw1SO_XmrceHW8Soxsoqx828KkYEkdLgMxUlAw-SApatl1pUQoqMe_XzDaNPevxkblpPXPD1JamFwXehx-QCNlY4Oo59Z03WmxN0FdSmUEeHm2fCWidUhcgs9P7e4H8Ky4HTVwLan7IHMc75MZosmnbMcY4G5o_XH1uoMjYAgSKSmnuac-NtnBhJ1ey2kaQU973K5KhaQFvNWQxoa6RID0iccEl1fLVVvTzst3v43iWsw"
                />
                <div className="absolute inset-0 p-8 flex items-center justify-center">
                  <div className="relative">
                    <span className="material-icons-outlined text-primary text-5xl drop-shadow-lg">location_on</span>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white dark:bg-slate-800 rounded-full border-2 border-primary animate-ping" />
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg shadow-md flex flex-col gap-2">
                  <button className="text-slate-600 dark:text-slate-400"><span className="material-icons-outlined">add</span></button>
                  <button className="text-slate-600 dark:text-slate-400 border-t pt-2 dark:border-slate-700"><span className="material-icons-outlined">remove</span></button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xl font-bold mb-1">Main Street EcoCenter</h5>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      0.8 miles • <span className="text-green-600 dark:text-green-400 font-medium">Open until 6:00 PM</span>
                    </p>
                  </div>
                  <button className="p-3 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition">
                    <span className="material-icons-outlined">directions</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    
</DemoPageLayout>
  );
}
