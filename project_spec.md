# Project Spec
## Summary

This application will allow teachers to create seating plans for their classes based on some teacher provided critera and restrictions.

The application should be called "Seat Planner".

## Platform

The application should be web based

### Deployment

For initial release, it is acceptable for application on a local server.

## Requirements

1) You should assume the class is a grid of pairs of seats. 
2) The application must allow the teacher the import a class list. 
3) The class list will be a CSV file with the following columns:
    a) Student Name (Last,First)
    b) Student Gender (M/F/O)
4) When first imported in, the application should initially just randomlly allocate students.
5) The application should have two regions on the screen:
    a) a left hand panel with a list of students
    b) a a right panel with a visual representation of the class room
6) The application will allow the user to select students in pairs (either via LHS or RHS) and via a click either:
    a) ban them from sitting next to each other.
    b) give a preference to that pair sitting next to each  other.
7) The application can be put into a mode where preference is given to sitting together with either:
    a) the same gender
    b) different gender.
8) The application will give the user the ability to manualy move students. These allocations will be given the highest preference.
9) The application will allow the user to then export the seating plan via a PDF view of the screen.
10) The application should allow the user to select a student a select a preference for either front or back row.




