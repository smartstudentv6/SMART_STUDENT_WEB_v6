// Debug script to check notification state
(function() {
  console.log('=== DEBUGGING NOTIFICATION STATE ===');
  
  const felipeUsername = 'felipe_estudiante';
  
  // 1. Check stored notifications
  const storedNotifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
  console.log('Total stored notifications:', storedNotifications.length);
  
  // 2. Check notifications for Felipe
  const felipeNotifications = storedNotifications.filter(notification => 
    notification.targetUserRole === 'student' &&
    notification.targetUsernames.includes(felipeUsername)
  );
  console.log('Notifications for Felipe:', felipeNotifications.length);
  
  // 3. Check unread notifications for Felipe
  const unreadForFelipe = felipeNotifications.filter(notification => 
    !notification.readBy.includes(felipeUsername)
  );
  console.log('Unread notifications for Felipe:', unreadForFelipe.length);
  
  // 4. Show details of each notification
  felipeNotifications.forEach((notification, index) => {
    console.log(`Notification ${index + 1}:`, {
      id: notification.id,
      type: notification.type,
      taskTitle: notification.taskTitle,
      read: notification.read,
      readBy: notification.readBy,
      isReadByFelipe: notification.readBy.includes(felipeUsername)
    });
  });
  
  // 5. Test the notification manager functions
  console.log('\n=== TESTING NOTIFICATION MANAGER ===');
  
  // Import the notification manager (assuming it's globally available)
  if (window.TaskNotificationManager) {
    const unreadCount = window.TaskNotificationManager.getUnreadCountForUser(felipeUsername, 'student');
    console.log('Unread count from manager:', unreadCount);
    
    const unreadNotifications = window.TaskNotificationManager.getUnreadNotificationsForUser(felipeUsername, 'student');
    console.log('Unread notifications from manager:', unreadNotifications.length);
  } else {
    console.log('TaskNotificationManager not available globally');
  }
  
})();
