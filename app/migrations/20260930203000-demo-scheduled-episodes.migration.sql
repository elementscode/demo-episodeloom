-- demo: morning publish times, and one scheduled episode per show
/** @env development */

update episodes set publishAt = publishAt + interval '7 hours'
 where showId in (select id from shows where slug in ('the-slow-kitchen', 'signal-and-noise'));

insert into files (name, contentType, size, data)
     select 'kitchen-7.mp3', contentType, size, data from files where name = 'kitchen-6.mp3';

insert into episodes (showId, number, title, notes, audioFileId, durationSeconds, publishAt)
     select s.id, 7, 'A loaf a week', 'One loaf, every Saturday, for a year. What changed:

- I stopped measuring the water and started **feeling the dough**
- the crust got darker, on purpose
- the starter lives on the counter now, not the fridge

Next week: what to do with the heels.', f.id, e.durationSeconds, (current_date + 5) + time '14:00'
       from shows s
       join files f on f.name = 'kitchen-7.mp3'
       join episodes e on e.showId = s.id and e.number = 6
      where s.slug = 'the-slow-kitchen';

insert into files (name, contentType, size, data)
     select 'signal-7.mp3', contentType, size, data from files where name = 'signal-6.mp3';

insert into episodes (showId, number, title, notes, audioFileId, durationSeconds, publishAt)
     select s.id, 7, 'Why software updates never end', 'Every update is a trade:

1. **Security fixes** close holes someone found
2. **Compatibility** keeps up with new phones and browsers
3. **Features**, the part you notice

Turning on automatic updates is the cheapest security you can buy.', f.id, e.durationSeconds, (current_date + 3) + time '14:00'
       from shows s
       join files f on f.name = 'signal-7.mp3'
       join episodes e on e.showId = s.id and e.number = 6
      where s.slug = 'signal-and-noise';
