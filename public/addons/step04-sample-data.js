// addon 04 placeholder

(()=> {
  // Step04: Sample data seeder (14, 21 items … grows in 7s)
  const KEY='ol:courses';
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]} }
  function set(v){ localStorage.setItem(KEY, JSON.stringify(v)); }
  const cats=['Web','Data','AI','Design','Biz','Lang','Cloud'];
  const lv=['Beginner','Intermediate','Advanced'];
  function seed(n=7){
    const cur=get(); const start=cur.length;
    for(let i=0;i<n;i++){
      const idx=start+i+1;
      cur.push({
        id:'c'+Date.now()+i,
        title:`Sample Course ${idx}`,
        category:cats[i%cats.length],
        level:lv[i%lv.length],
        rating: 3.5 + (i%3)*0.5,
        price: (i%2?0:49.0),
        hours: 6 + (i%5),
        img: `/images/samples/${(i%10)+1}.jpg`,
        short:`This is a short teaser for course ${idx}`,
        benefits:['Hands-on','Certificate','Projects'],
        credits: 3,
        paid: (i%2===0)
      });
    }
    set(cur); return cur.length;
  }
  // Hook existing button id(s)
  ['btn-add-sample','btn-add-sample-more'].forEach(id=>{
    const b=document.getElementById(id); if (!b) return;
    b.onclick=()=>{
      const cur=get().length;
      const add = cur<7?7: (cur<14?7:7); // keep adding 7
      const total = seed(add);
      window.renderCourses?.(); // let existing renderer redraw
      alert(`Added ${add} samples (total ${total})`);
    };
  });
  // expose for admin modal “Add Simple Course”
  window.addSimpleCourse = (c)=>{
    const cur=get(); cur.push(c); set(cur); window.renderCourses?.();
  };
})();