import Link from 'next/link';
import DemoPageLayout from "@/components/DemoPageLayout";


export default function EducationPage() {
  return (
     <DemoPageLayout title="Education Services" activeNav="education">

      <main className="space-y-8">
        <div className="relative max-w-2xl mx-auto md:mx-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-outlined text-slate-400">search</span>
          <input
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary transition-all"
            placeholder="Search schools or programs"
            type="text"
          />
        </div>
        <section className="relative rounded-3xl overflow-hidden aspect-[21/9] md:aspect-[3/1] shadow-lg group">
          <img
            alt="Back to School classroom illustration"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src="https://images.unsplash.com/photo-1588072432836-e10032774350"          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10">
            <span className="text-xs font-bold tracking-widest uppercase text-white/80 mb-1">Seasonal Guide</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Back to School 2024</h2>
          </div>
        </section>
        <section>
          <h3 className="text-xl font-bold mb-4">Our Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <span className="material-icons-outlined text-primary">school</span>
                </div>
                <img
                  alt="Books and Apple"
                  className="w-16 h-16 rounded-xl object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJzzz4d8eVaaj2BxG7GZUH5_ozAEu_O2-qPqIllf_iCYBHaJiJlYXhILSeqFVNkaSTh8H1WmTRi0a4MdVsbOKI80DcH7JCLLJrRLxUHAW8JmG6CxQNTIF5n_KdiN7QtcCwVMUE3vbTHQdfHltKJjzVrvtV28kXLfJ-gPLI-3pRr3-LPHjkHfodSXP4kdaCDJvmakDRcewrxsMvOyHFv2o7gJZDWoQhWzO2CzIV71Yp23cWG61MF8i_WT3k76LyIN30URZg86tKfP8"
                />
              </div>
              <h4 className="font-bold text-lg mb-2">School Registration</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">Enroll your child in local public schools for the upcoming term.</p>
              <button className="w-full bg-primary text-white font-semibold py-3 rounded-2xl hover:bg-blue-700 transition-colors">Enroll Now</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <span className="material-icons-outlined text-primary">local_library</span>
                </div>
                <img
                  alt="Library interior"
                  className="w-16 h-16 rounded-xl object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr0Xfh9LeAUA4wngAFHIu_FY0zunDZbLhnagcmAkTg4jfMaW82deczGCPnsrefV3OPFXix8GTQ417CreR3j-Ds1XfeAGu_MZkefibYqwctNxN-gg2zbsUXipGSUPN1DfqJH47I6yb4OCdMmAoN4BiDDxtYenLGaJL-blqM6-5WYZw2Ufrzn0QEkO9QJIf7ce9L4LcGDmLbxLqmaBe9zy9x1ZaXSOUSweUP38HPxRcg8lMXaSXXGDYb8AMdN21QHwhBiWE0vq3dCMU"
                />
              </div>
              <h4 className="font-bold text-lg mb-2">Library Services</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">Access digital catalogs, book rentals, and community study spaces.</p>
              <button className="w-full bg-blue-50 dark:bg-slate-700 text-primary dark:text-blue-400 font-semibold py-3 rounded-2xl hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors">Find Library</button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <span className="material-icons-outlined text-primary">history_edu</span>
                </div>
                <img
                  alt="Adults studying"
                  className="w-16 h-16 rounded-xl object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9NNIqMLvJJa-b1CJgFsyWMKquBXGX4blMa4kNog0Fhxh3yso9Fz6duE0BTvK3F-wiE2wD2F8xRw5LuqjpjeWDjWxabtN5NRzcz1gfYUf6cfcebbYlp9yv1jPLhXmMTRHjLjxncd9Q4CsadnWLqBK1kuuQ_lOAoXwYpx5tgFu0gVmfht0-zdGHPjq_yV9fv2NgzEN6wdFQOm0fXCuUPnD0UM__mhiAYqxECxH9_xjmGyCqumM_u9ASgjsgPuRiOmtgSiCXDYxrcjw"
                />
              </div>
              <h4 className="font-bold text-lg mb-2">Adult Learning</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">Skill development, vocational training, and night classes for adults.</p>
              <button className="w-full bg-blue-50 dark:bg-slate-700 text-primary dark:text-blue-400 font-semibold py-3 rounded-2xl hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors">View Courses</button>
            </div>
          </div>
        </section>
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Board Meetings</h3>
            <a className="text-primary font-semibold text-sm" href="#">See All</a>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            <button className="w-full flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4">
                <span className="text-[10px] font-bold text-primary uppercase">Oct</span>
                <span className="text-xl font-bold text-primary">12</span>
              </div>
              <div className="flex-grow text-left">
                <h5 className="font-bold text-slate-900 dark:text-white">Curriculum Review 2024</h5>
                <p className="text-sm text-slate-500 dark:text-slate-400">6:30 PM • City Hall Room 4</p>
              </div>
              <span className="material-icons-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button className="w-full flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4">
                <span className="text-[10px] font-bold text-primary uppercase">Oct</span>
                <span className="text-xl font-bold text-primary">15</span>
              </div>
              <div className="flex-grow text-left">
                <h5 className="font-bold text-slate-900 dark:text-white">Budget Allocation Hearing</h5>
                <p className="text-sm text-slate-500 dark:text-slate-400">5:00 PM • Virtual Meeting</p>
              </div>
              <span className="material-icons-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
            <button className="w-full flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl mr-4">
                <span className="text-[10px] font-bold text-primary uppercase">Oct</span>
                <span className="text-xl font-bold text-primary">22</span>
              </div>
              <div className="flex-grow text-left">
                <h5 className="font-bold text-slate-900 dark:text-white">New School Safety Protocol</h5>
                <p className="text-sm text-slate-500 dark:text-slate-400">7:00 PM • Southside High</p>
              </div>
              <span className="material-icons-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
          </div>
        </section>
      </main>
      

  </DemoPageLayout>
  );
}
