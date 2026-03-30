import Link from 'next/link';
import DemoPageLayout from "@/components/DemoPageLayout";

export default function TaxesPage() {
  return (
     <DemoPageLayout title="Taxes" activeNav="taxes">

      <main className="py-8">
        
         <section className="relative rounded-3xl overflow-hidden aspect-[21/9] md:aspect-[3/1] shadow-lg group">
          <img
            alt="Back to School classroom illustration"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
            <span className="text-xs font-bold tracking-widest uppercase text-white/80 mb-1">Seasonal Guide</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Your Taxes</h2>
          </div>
        </section>
        
        <h3 className="text-xl font-bold mb-4 mt-[30px]">Your Tax Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Pending Payment</span>
                <h3 className="text-xl font-bold mt-1">Property Tax 2024</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">$1,240.50 Due Oct 31, 2024</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <span className="material-icons-outlined text-primary">home</span>
              </div>
            </div>
            <button className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
              <span className="material-icons-outlined text-lg">payments</span>
              Pay Now
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">Active Status</span>
                <h3 className="text-xl font-bold mt-1">Business License</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Valid until Dec 15, 2024</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <span className="material-icons-outlined text-emerald-600 dark:text-emerald-400">storefront</span>
              </div>
            </div>
            <button className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
              <span className="material-icons-outlined text-lg">autorenew</span>
              Renew Early
            </button>
          </div>
        </div>
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Tax Relief Programs</h3>
            <button className="text-primary font-medium text-sm hover:underline">View All</button>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="material-icons-outlined text-white">info</span>
              </div>
              <div>
                <h4 className="font-bold">Senior Citizens Exemption</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Check eligibility for property tax reductions.</p>
              </div>
            </div>
            <span className="material-icons-outlined text-slate-400">chevron_right</span>
          </div>
        </section>
        <section>
          <h3 className="text-xl font-bold mb-4">Past Payments</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <span className="material-icons-outlined text-slate-500">water_drop</span>
                </div>
                <div>
                  <h4 className="font-bold">Water Utility Tax</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Aug 20, 2023 • $84.20</p>
                </div>
              </div>
              <span className="material-icons-outlined text-primary">picture_as_pdf</span>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <span className="material-icons-outlined text-slate-500">receipt_long</span>
                </div>
                <div>
                  <h4 className="font-bold">Property Tax Q3</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jul 15, 2023 • $1,240.50</p>
                </div>
              </div>
              <span className="material-icons-outlined text-primary">picture_as_pdf</span>
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <span className="material-icons-outlined text-slate-500">apartment</span>
                </div>
                <div>
                  <h4 className="font-bold">Zoning Fee</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">May 12, 2023 • $45.00</p>
                </div>
              </div>
              <span className="material-icons-outlined text-primary">picture_as_pdf</span>
            </div>
          </div>
        </section>
      </main>
    </DemoPageLayout>
  );
}
