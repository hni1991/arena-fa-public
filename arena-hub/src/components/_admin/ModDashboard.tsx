"use client";

export default function ModDashboard() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="card p-4">
        <h3 className="font-bold mb-1">بازی‌ها</h3>
        <p className="opacity-70 text-sm">افزودن/ویرایش و وضعیت فعال.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">تورنمنت‌ها</h3>
        <p className="opacity-70 text-sm">ساخت و مدیریت چرخه.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">کلن‌ها</h3>
        <p className="opacity-70 text-sm">مدیریت اطلاعات و بنر.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">هایلایت‌ها</h3>
        <p className="opacity-70 text-sm">انتخاب برگزیده‌های هفته.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">کاربران</h3>
        <p className="opacity-70 text-sm">فهرست و جستجو.</p>
      </div>
      <div className="card p-4">
        <h3 className="font-bold mb-1">تنظیمات</h3>
        <p className="opacity-70 text-sm">تم و متن‌های لندینگ.</p>
      </div>
    </section>
  );
}
