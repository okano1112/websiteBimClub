// MOCKUP-START: ADMIN WORKSPACE DATA
// MOCKUP DATA ONLY - Replace Dashboard, Reports, and System Settings with real APIs before production.
window.BimClubAdminMockData = Object.freeze({
  dashboard: {
    stats: [
      { label: 'สมาชิกทั้งหมด', value: '1,248', trend: '+8.2% เดือนนี้' },
      { label: 'คอร์สที่เผยแพร่', value: '24', trend: '+3 คอร์สใหม่' },
      { label: 'เนื้อหารอตรวจ', value: '7', trend: 'ต้องดำเนินการ' },
      { label: 'คำขออาจารย์', value: '12', trend: '+4 สัปดาห์นี้' }
    ],
    activities: [
      { text: 'มีคำขอสิทธิ์อาจารย์ใหม่จาก Narin P.', time: '10 นาทีที่แล้ว' },
      { text: 'คอร์ส BIM Coordination ถูกเผยแพร่', time: '1 ชั่วโมงที่แล้ว' },
      { text: 'ผู้ดูแลแก้ไขกิจกรรม Workshop 2026', time: '3 ชั่วโมงที่แล้ว' },
      { text: 'มีสมาชิกใหม่ยืนยันอีเมลสำเร็จ', time: 'เมื่อวานนี้' }
    ]
  },
  reports: [
    { id: 1, period: 'ก.ย. 2026', category: 'สมาชิก', metric: 'สมาชิกใหม่', value: 86, change: 12.4, status: 'positive' },
    { id: 2, period: 'ก.ย. 2026', category: 'คอร์ส', metric: 'ผู้เรียนที่เริ่มคอร์ส', value: 314, change: 7.8, status: 'positive' },
    { id: 3, period: 'ก.ย. 2026', category: 'คอร์ส', metric: 'อัตราเรียนจบ', value: '68%', change: -2.1, status: 'attention' },
    { id: 4, period: 'ส.ค. 2026', category: 'เนื้อหา', metric: 'โพสต์ที่เผยแพร่', value: 42, change: 5.0, status: 'positive' },
    { id: 5, period: 'ส.ค. 2026', category: 'สมาชิก', metric: 'สมาชิก Active', value: 907, change: 3.6, status: 'positive' },
    { id: 6, period: 'ก.ค. 2026', category: 'คำขอ', metric: 'เวลาตรวจคำขอเฉลี่ย', value: '1.8 วัน', change: -15.0, status: 'positive' },
    { id: 7, period: 'ก.ค. 2026', category: 'เนื้อหา', metric: 'รายการรอตรวจ', value: 11, change: 22.2, status: 'attention' }
  ],
  settings: {
    clubName: 'BimClub',
    contactEmail: 'admin@bimclub.local',
    defaultRole: 'user',
    requireEmailVerification: true,
    allowInstructorRequests: true,
    maintenanceMode: false
  }
});
// MOCKUP-END: ADMIN WORKSPACE DATA
