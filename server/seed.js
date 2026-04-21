const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Complaint = require('./models/Complaint');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing
    await User.deleteMany({});
    await Complaint.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const admin = await User.create({
      name: 'Admin Officer',
      email: 'admin@demo.com',
      password: 'demo123',
      role: 'admin',
      phone: '9876543210',
      department: 'Municipal Corporation'
    });

    const citizen = await User.create({
      name: 'Ramesh Kumar',
      email: 'citizen@demo.com',
      password: 'demo123',
      role: 'citizen',
      phone: '9876543211'
    });

    const officer = await User.create({
      name: 'Priya Sharma',
      email: 'officer@demo.com',
      password: 'demo123',
      role: 'officer',
      department: 'Roads & Infrastructure'
    });

    console.log('Created users');

    // Create sample complaints
    const complaints = [
      { title: 'Large pothole on Civil Lines Road', description: 'There is a large pothole near the Civil Lines crossing that has caused multiple accidents. Urgent repair needed.', category: 'road', priority: 'high', status: 'in_progress', location: { area: 'Civil Lines', city: 'Jabalpur', address: 'Near Civil Lines crossing', latitude: 23.1815, longitude: 79.9864 } },
      { title: 'No water supply for 3 days', description: 'Our entire locality has had no water supply for the past 3 days. Women and children are severely affected.', category: 'water', priority: 'critical', status: 'under_review', location: { area: 'Napier Town', city: 'Jabalpur', latitude: 23.1750, longitude: 79.9400 } },
      { title: 'Broken streetlight near school', description: 'The streetlight near Government School is broken for 2 weeks causing safety issues for children in the evening.', category: 'electricity', priority: 'medium', status: 'pending', location: { area: 'Gwarighat', city: 'Jabalpur', latitude: 23.1600, longitude: 79.9200 } },
      { title: 'Garbage not collected for a week', description: 'The garbage in our locality has not been collected for over a week. It is causing a severe health hazard and foul smell.', category: 'sanitation', priority: 'high', status: 'resolved', location: { area: 'Madan Mahal', city: 'Jabalpur', latitude: 23.1900, longitude: 79.9700 } },
      { title: 'Overflowing drain on main road', description: 'The main drain on the bazaar road is overflowing causing sewage to flood the street. Very unhygienic.', category: 'sewage', priority: 'critical', status: 'pending', location: { area: 'Sadar Bazaar', city: 'Jabalpur', latitude: 23.1700, longitude: 79.9500 } },
      { title: 'Park equipment damaged', description: 'The swings and slides in the public park are broken and pose a danger to children. Immediate repair needed.', category: 'parks', priority: 'medium', status: 'in_progress', location: { area: 'Wright Town', city: 'Jabalpur', latitude: 23.1850, longitude: 79.9650 } },
    ];

    for (const c of complaints) {
      const complaint = new Complaint({
        ...c,
        submittedBy: citizen._id,
        assignedTo: c.status !== 'pending' ? officer._id : null,
        statusHistory: [
          { status: 'pending', changedBy: citizen._id, note: 'Complaint submitted', changedAt: new Date(Date.now() - 7*24*60*60*1000) },
          ...(c.status !== 'pending' ? [{ status: c.status, changedBy: admin._id, note: 'Status updated by admin', changedAt: new Date() }] : [])
        ],
        ...(c.status === 'resolved' ? { resolvedAt: new Date(), feedback: { rating: 4, comment: 'Issue was resolved quickly. Thank you!' } } : {})
      });
      await complaint.save();
    }

    console.log('Created sample complaints');
    console.log('\n✅ Database seeded successfully!');
    console.log('\nDemo accounts:');
    console.log('  Admin:   admin@demo.com / demo123');
    console.log('  Citizen: citizen@demo.com / demo123');
    console.log('  Officer: officer@demo.com / demo123');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
